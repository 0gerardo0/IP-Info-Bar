import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.ip-info-bar';

export default class IPInfoExtension extends Extension {
    constructor(metadata) {
      super(metadata);
      this._indicator = null;
      this._timeoutId = null;
      this._currentType = 0;
      this._cache = { data: null, timestamp: 0 };
      this._cacheTTL = 20000;
      this.settings = null;
      this._availableLabels = [];

      this._buttonPressEventId = null;
      this._menuOpenStateEventId = null;
      this._isLeftClick = false;
    }

    _getPythonScript() {
      const script = this.dir.get_child('backend').get_child('utils.py');
        return script.get_path();
    }

    async _fetchIPDataAsync() {
      const now = Date.now();
      if (this._cache.data && (now - this._cache.timestamp) < this._cacheTTL) {
          return this._cache.data;
      }

      try {
        const pythonPath = this._getPythonScript();
        const pythonExec = GLib.find_program_in_path('python3');
        
        if (!pythonExec) {
          return null;
        }          

        const argv = [pythonExec, pythonPath]

        const [success, pid, stdinFd, stdoutFd] = GLib.spawn_async_with_pipes(
          null,
          argv,
          null,
          GLib.SpawnFlags.DO_NOT_REAP_CHILD,
          null
        );

        if (!success) {
          return null;
        }

        GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, () => {
          GLib.spawn_close_pid(pid);
        });

        const stdoutStream = new Gio.DataInputStream({
          base_stream: new Gio.UnixInputStream({ fd: stdoutFd, close_fd: true }),
        });

        const data = await new Promise((resolve) => {
          stdoutStream.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, res) => {
            try {
              const [line] = stream.read_line_finish(res) || [];
              if (!line) {
                resolve(null);
                return;
              }

              const output = new TextDecoder().decode(line).trim();

              try {
                const json = JSON.parse(output);
                if (json.error){
                  resolve(null);
                  return;
                }
                resolve(json);
              } catch (parseError) {
                  console.error(_('[ERROR] Failed parse JSON:'), parseError.message);
                  resolve(null);
              }
          } catch (readError) {
              console.error(_('[ERROR] Exception during read:'), readError.message);
              resolve(null);
            }
          });
        });

        if (data) {
          this._cache = { data, timestamp: now };
        }
        return data;

      } catch (e) {
        console.error(_('[ERROR] Exception during _fetchIPDataAsync:'), e.message);
        return null;
      }
    }


    async _updateLabel() {
      try {
        const data = await this._fetchIPDataAsync();

        if(!this._indicator){
          return;
        }
        
        if (!data) {
          this._indicator.label.text = 'Error';
          this._availableLabels = [];
          return;
        }

        if (!this.settings){
          return;
        }

        const isDetailed = this.settings.get_boolean('detailed-view')
        const labels = [];

        if (isDetailed) {
          if (data.lan_ip4 && data.lan_ip4.address) {
            labels.push(`${data.lan_ip4.interface}: ${data.lan_ip4.address}`);
            if (data.lan_ip4.mac) {
              labels.push(`MAC_IP4: ${data.lan_ip4.mac}`);
            }
          }
          if (data.wan_ip4) {
            labels.push(`WAN: ${data.wan_ip4}`);
          }
          if (data.lan_ip6 && data.lan_ip6.address) {
            labels.push(`${data.lan_ip6.interface}: ${data.lan_ip6.address}`);
            if (data.lan_ip6.mac) {
              labels.push(`MAC_IP6: ${data.lan_ip6.mac}`);
            }
          }
          if (data.tun0_vpn && data.tun0_vpn.address) {
            labels.push(`${data.tun0_vpn.interface}: ${data.tun0_vpn.address}`);
          }
        } else {
          if (data.lan_ip4 && data.lan_ip4.address) {
            labels.push(`IPv4: ${data.lan_ip4.address}`);
          }
          if (data.wan_ip4) {
            labels.push(`WAN: ${data.wan_ip4}`);
          }
          if (data.lan_ip6 && data.lan_ip6.address) {
            labels.push(`IPv6: ${data.lan_ip6.address}`);
          }
          if (data.tun0_vpn && data.tun0_vpn.address) {
            labels.push(`VPN: ${data.tun0_vpn.address}`);
          }
        }
        if (data.has_remote_ssh || data.has_incoming_ssh) {
          if (data.has_remote_ssh && data.has_incoming_ssh) {
            labels.push(_('SSH: Multiple'));
          } else if (data.has_remote_ssh) {
            labels.push(_('SSH: Outgoing'));
          } else {
            labels.push(_('SSH: Incoming'));
          }
        }
        
        this._availableLabels = labels;


        if (labels.length === 0) {
          this._indicator.label.text = _('No connection');
          return;
        }
        
        if (this._currentType >= this._availableLabels.length) {
          this._currentType = 0;
        }

        this._indicator.label.text = this._availableLabels[this._currentType];

      } catch (e) {
        console.error(_(`[IP Info Bar] Failed to update label: ${e}`));
        this._indicator.label.text = 'Error!';
        this._availableLabels = [];
      }
    }

    _createButton() {
      this._indicator = new PanelMenu.Button(0.0, 'IPInfoButton');
      this._indicator.reactive = true;
      const label = new St.Label({
        text: _('Loading...'),
        y_align: Clutter.ActorAlign.CENTER,
      });
      this._indicator.add_child(label);
      this._indicator.label = label;
      
      const copyMenuItem = new PopupMenu.PopupMenuItem(_('Copy'));

      this._indicator.menu.addMenuItem(copyMenuItem);

      copyMenuItem.connect('activate', () => {
        const fullText = this._indicator.label.text;
        let textToCopy = fullText;

        const parts = fullText.split(': ');

        if (parts.length > 1) {
          textToCopy = parts.pop().trim();
        }

        St.Clipboard.get_default().set_text(
          St.ClipboardType.CLIPBOARD,
          textToCopy
        )
      });

      return this._indicator;
    }

    enable() {
      
      this.settings = this.getSettings(SCHEMA_ID);
      this._indicator = this._createButton();
      Main.panel.addToStatusArea(this.uuid, this._indicator);
        
      this._buttonPressEventId = this._indicator.connect('button-press-event', (actor, event) => {
        const btn = event.get_indicator();

        if (btn === 1) {
          this._isLeftClick = true;
          if (this._availableLabels.length > 0 && this._availableLabels.length > 0) {
            this._currentType = (this._currentType + 1) % this._availableLabels.length;
            this._indicator.label.text = this._availableLabels[this._currentType];
          }
          if (this._indicator.menu.isOpen) {
            this._indicator.menu.close();
          }
          return Clutter.EVENT_STOP;
        }
        this._isLeftClick = false;
        return Clutter.EVENT_PROPAGATE;
      });

      this._menuOpenStateEventId = this._indicator.menu.connect('open-stage-changed', (menu, open) => {
        if (open && this._isLeftClick) {
          menu.close();
        }
      });

      this._timeoutId = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        15,
        () => {
          this._updateLabel();
          return GLib.SOURCE_CONTINUE;
        }
      );

      this._updateLabel();
    }

    disable() {
      if (this._timeoutId) {
        GLib.source_remove(this._timeoutId);
        this._timeoutId = null;
      }

      if (this._indicator) {
        if (this._buttonPressEventId) {
          this._indicator.disconnect(this._buttonPressEventId);
          this._buttonPressEventId = null;
        }
        if (this._menuOpenStateEventId) {
          this._indicator.menu.disconnect(this._menuOpenStateEventId);
          this._menuOpenStateEventId = null;
        }
      }

      this._indicator?.destroy();
      this._indicator = null;

      this.settings = null;
      this._availableLabels = null;
      this._cache = null;
      this._isLeftClick = false;
    }
  }
