import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.ip-info-bar';

export default class IPInfoBarPreferences extends ExtensionPreferences {
    getPreferencesWidget() {
        this.settings = this.getSettings(SCHEMA_ID);

        const page = new Adw.PreferencesPage();
        
        const group = new Adw.PreferencesGroup({
            title: 'Configuración de Visualización',
            description: 'Personaliza cómo se muestra la información en la barra.',
        });
        page.add(group);

        const row = new Adw.ActionRow({
            title: 'Activar Vista Detallada',
            subtitle: 'Muestra la interfaz y la dirección MAC.',
        });
        group.add(row);

        const toggle = new Gtk.Switch({
            active: this.settings.get_boolean('detailed-view'),
            valign: Gtk.Align.CENTER,
        });
        row.add_suffix(toggle);
        row.activatable_widget = toggle;

        toggle.connect('notify::active', () => {
            this.settings.set_boolean('detailed-view', toggle.active);
        });
        
        return page;
    }
}
