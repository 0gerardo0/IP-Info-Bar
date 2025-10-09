import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.ip-info-bar';

export default class IPInfoExtension extends Extension {
    constructor(metadata) {
      super(metadata);
      this._button = null;
      this._timeoutId = null;
      this._currentType = 0;
      this._cache = { data: null, timestamp: 0 };
      this._cacheTTL = 20000;
      this.settings = null;
      this._availableLabels = [];
    }

    _getPythonScript() {
        const script = this.dir.get_child('backend').get_child('utils.py');
        return script.get_path();
    }

    async _fetchIPDataAsync() {
        const now = Date.now();
        if (this._cache.data && (now - this._cache.timestamp) < this._cacheTTL) {
            console.log('[DEBUG] Usando datos cacheados');
            return this._cache.data;
        }

        try {
            const pythonPath = this._getPythonScript();
            const pythonExec = GLib.find_program_in_path('python3');
            
            if (!pythonExec) {
              console.error('[ERROR] El ejecutable de python3 no se encontro en el path');
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
                console.error('[ERROR] No se pudo lanzar el proceso async');
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
                            console.error('[ERROR] No se pudo leer salida del script');
                            resolve(null);
                            return;
                        }

                        const output = new TextDecoder().decode(line).trim();
                        console.log(`[DEBUG] Output async: '${output}'`);

                        try {
                            const json = JSON.parse(output);
                            if (json.error){
                              console.error(`[ERROR] El script de Python dvolvio un error: ${json.error}`);
                              resolve(null);
                              return;
                            }
                            resolve(json);
                        } catch (parseError) {
                            console.error('[ERROR] Fallo al parsear JSON:', parseError.message);
                            resolve(null);
                        }
                    } catch (readError) {
                        console.error('[ERROR] Excepción durante lectura:', readError.message);
                        resolve(null);
                    }
                });
            });

            if (data) {
                this._cache = { data, timestamp: now };
            }
            return data;

        } catch (e) {
            console.error('[ERROR] Excepción durante _fetchIPDataAsync:', e.message);
            return null;
        }
    }


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
              labels.push('SSH: Múltiple');
            } else if (data.has_remote_ssh) {
              labels.push('SSH: Saliente');
            } else {
              labels.push('SSH: Entrante');
            }
          }
          
          this._availableLabels = labels;


          if (labels.length === 0) {
              this._button.label.text = 'Sin conexión';
              return;
          }
          
          if (this._currentType >= this._availableLabels.length) {
              this._currentType = 0;
          }

          this._button.label.text = this._availableLabels[this._currentType];

      } catch (e) {
          console.error(`[IP-Info-Bar] Error al actualizar la etiqueta: ${e}`);
          this._button.label.text = 'Error!';
          this._availableLabels = [];
      }
    }

    _createButton() {
        this._button = new PanelMenu.Button(0.0, 'IPInfoButton');
        const label = new St.Label({
            text: 'Loading...',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._button.add_child(label);
        this._button.label = label;
        return this._button;
    }

    enable() {
        
        this.settings = this.getSettings(SCHEMA_ID);
         
        this._button = this._createButton();
        Main.panel.addToStatusArea(this.uuid, this._button);
        
        this._button.connect('button-press-event', () => {
          if (this._availableLabels.length === 0){
            return;
          }
          this._currentType = (this._currentType +1) % this._availableLabels.length;
          this._button.label.text = this._availableLabels[this._currentType];
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
        if (this._button) {
            this._button.destroy();
            this._button = null;
        }
    }
  }
