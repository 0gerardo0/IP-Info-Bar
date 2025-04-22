import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class IPInfoExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._button = null;
        this._timeoutId = null;
        this._currentType = 0;
        this._cache = { data: null, timestamp: 0 };
        this._cacheTTL = 20000;
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
            const pythonExec = '/usr/bin/python3';
            const argv = [pythonExec, pythonPath];

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
        const data = await this._fetchIPDataAsync();
        console.log(`[IP Debug] Data received: ${JSON.stringify(data)}`);

        if (!data) {
            this._button.label.text = 'Error';
            return;
        }

        let label;
        switch (this._currentType) {
            case 0:
                label = data.lan_ip4 || 'Sin LAN IPv4';
                break;
            case 1:
                label = data.wan_ip4 || 'Sin WAN IPv4';
                break;
            case 2:
                label = data.lan_ip6 || 'Sin IPv6';
                break;
            case 3:
                label = data.tun0_vpn || 'Sin VPN';
                break;
            default:
                label = 'Modo Inválido';
        }

        this._button.label.text = label.substring(0, 50);
    }

    _createButton() {
        this._button = new PanelMenu.Button(0.0, 'IPInfoButton');
        const label = new St.Label({
            text: 'Loading...',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._button.add_child(label);
        this._button.label = label;
        this._button.connect('button-press-event', () => {
            this._currentType = (this._currentType + 1) % 4;
            this._updateLabel();
        });
        return this._button;
    }

    enable() {
        this._button = this._createButton();
        Main.panel.addToStatusArea(this.uuid, this._button);

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
