import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.ip-info-bar';

/**
 * IP Info Bar Extension
 * 
 * Displays network information (LAN IPv4/IPv6, WAN IPv4, VPN, SSH status)
 * in the GNOME Shell top panel. Information cycles on click and updates
 * periodically by calling a Python backend script.
 */
export default class IPInfoExtension extends Extension {
    constructor(metadata) {
      super(metadata);
      this._button = null;                          // Panel button widget
      this._timeoutId = null;                       // Update timer ID
      this._currentType = 0;                        // Current label index
      this._cache = { data: null, timestamp: 0 };   // Cached network data
      this._cacheTTL = 20000;                       // Cache time-to-live (20 seconds)
      this.settings = null;                         // Extension settings
      this._availableLabels = [];                   // Array of labels to cycle through
    }

    /**
     * Gets the path to the Python backend script
     * @returns {string} Absolute path to utils.py
     */
    _getPythonScript() {
      const script = this.dir.get_child('backend').get_child('utils.py');
        return script.get_path();
    }

    /**
     * Fetches network data from the Python backend script
     * 
     * Uses caching to avoid excessive calls to the backend script.
     * Spawns the Python script asynchronously and parses JSON output.
     * 
     * @returns {Promise<Object|null>} Network data object or null on error
     */
    async _fetchIPDataAsync() {
      const now = Date.now();
      // Return cached data if still valid
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

        // Spawn Python script asynchronously
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

        // Clean up child process when it exits
        GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, () => {
          GLib.spawn_close_pid(pid);
        });

        const stdoutStream = new Gio.DataInputStream({
          base_stream: new Gio.UnixInputStream({ fd: stdoutFd, close_fd: true }),
        });

        // Read and parse JSON output from Python script
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

        // Update cache with fresh data
        if (data) {
          this._cache = { data, timestamp: now };
        }
        return data;

      } catch (e) {
        console.error(_('[ERROR] Exception during _fetchIPDataAsync:'), e.message);
        return null;
      }
    }

    /**
     * Updates the panel label with current network information
     * 
     * Fetches data from the backend and constructs appropriate labels
     * based on the detailed-view setting. Handles simple and detailed modes.
     */
    async _updateLabel() {
      try {
        const data = await this._fetchIPDataAsync();
        
        if (!data) {
          this._button.label.text = 'Error';
          this._availableLabels = [];
          return;
        }
        
        const isDetailed = this.settings.get_boolean('detailed-view')
        const labels = [];

        // Build label array based on detailed view setting
        if (isDetailed) {
          // Detailed mode: show interface names and MAC addresses
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
          // Simple mode: show only IP addresses
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
        
        // Add SSH status indicator if connections detected
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
          this._button.label.text = _('No connection');
          return;
        }
        
        // Ensure current index is within bounds
        if (this._currentType >= this._availableLabels.length) {
          this._currentType = 0;
        }

        this._button.label.text = this._availableLabels[this._currentType];

      } catch (e) {
        console.error(_(`[IP Info Bar] Failed to update label: ${e}`));
        this._button.label.text = 'Error!';
        this._availableLabels = [];
      }
    }

    /**
     * Creates the panel button with label and context menu
     * @returns {PanelMenu.Button} The created button widget
     */
    _createButton() {
      this._button = new PanelMenu.Button(0.0, 'IPInfoButton');
      this._button.reactive = true;
      const label = new St.Label({
        text: _('Loading...'),
        y_align: Clutter.ActorAlign.CENTER,
      });
      this._button.add_child(label);
      this._button.label = label;
      
      // Add "Copy" menu item to copy IP address to clipboard
      const copyMenuItem = new PopupMenu.PopupMenuItem(_('Copy'));

      this._button.menu.addMenuItem(copyMenuItem);

      copyMenuItem.connect('activate', () => {
        const fullText = this._button.label.text;
        let textToCopy = fullText;

        // Extract just the IP address (after the colon)
        const parts = fullText.split(': ');

        if (parts.length > 1) {
          textToCopy = parts.pop().trim();
        }

        St.Clipboard.get_default().set_text(
          St.ClipboardType.CLIPBOARD,
          textToCopy
        )
      });

      return this._button;
    }

    /**
     * Enables the extension
     * 
     * Creates the panel button, sets up click handlers for cycling through
     * labels, and starts the periodic update timer (every 15 seconds).
     */
    enable() {
      
      this.settings = this.getSettings(SCHEMA_ID);
      this._button = this._createButton();
      Main.panel.addToStatusArea(this.uuid, this._button);
        
      this._isLeftClick = false;

      // Left-click cycles through available labels
      this._button.connect('button-press-event', (actor, event) => {
        const btn = event.get_button();

        if (btn === 1) {
          this._isLeftClick = true;
          if (this._availableLabels.length > 0) {
            this._currentType = (this._currentType + 1) % this._availableLabels.length;
            this._button.label.text = this._availableLabels[this._currentType];
          }
          // Close menu if open (left-click should only cycle, not open menu)
          if (this._button.menu.isOpen) {
            this._button.menu.close();
          }
          return Clutter.EVENT_STOP;
        }
        this._isLeftClick = false;
        return Clutter.EVENT_PROPAGATE;
      });

      // Prevent menu from opening on left-click
      this._button.menu.connect('open-stage-changed', (menu, open) => {
        if (open && this._isLeftClick) {
          menu.close();
        }
      });

      // Update label every 15 seconds
      this._timeoutId = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        15,
        () => {
          this._updateLabel();
          return GLib.SOURCE_CONTINUE;
        }
      );

      // Initial update
      this._updateLabel();
    }

    /**
     * Disables the extension
     * 
     * Removes the update timer and destroys the panel button.
     */
    disable() {
      if (this._timeoutId) {
        GLib.source_remove(this._timeoutId);
        this._timeoutId = null;
      }
      if (this._button) {
        this._button.destroy();
        this._button = null;
      }
    }
  }
