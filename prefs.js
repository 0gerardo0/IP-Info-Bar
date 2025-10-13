import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.ip-info-bar';

export default class IPInfoBarPreferences extends ExtensionPreferences {
    getPreferencesWidget() {
        this.settings = this.getSettings(SCHEMA_ID);

        const page = new Adw.PreferencesPage();
        
        const group = new Adw.PreferencesGroup({
            title: _('Display Settings'),
            description: _('Customize how information is displayed in the panel.'),
        });
        page.add(group);

        const row = new Adw.ActionRow({
            title: _('Activate Detailed View'),
            subtitle: _('Show the network interface and MAC address.'),
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
