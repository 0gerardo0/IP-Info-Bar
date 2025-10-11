# IP Info Bar – GNOME Shell Extension

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
![GNOME Shell](https://img.shields.io/badge/GNOME-45+-important)
![Status](https://img.shields.io/badge/status-alpha-orange)

Una extensión de GNOME Shell diseñada para desarrolladores, administradores de sistemas y entusiastas de redes que necesitan visivilidad inmediata de su estado de conectividad. Muestra información de red critica directamente en la barra superior, y permite alternar entre multiples detalles con un solo clic.

---

## Características

* **Múltiples Cistas de IP:** Rotafacilmente entre tu IP de LAN (IPv4), IP publica (WAN), IPv6 y la IP de tu túnel VPN (`tun0`).
* **Detección de SSH Inteligente:** Un indicador aparece automáticamente en el ciclo de visialización **solo si** hay una conexion SSH activa (entrante o saliente), manteniendose oculto en caso contrario.

* **Dos modo de Visualización:**
    * **Vista Simple:** Muestra unicamente la direción IP para una apariencia limpia.
    * **Vista Detallada:** Muestra información extendida como el nombre de la interfaz de red (`enp2s0`, `wlo1`) y la dirección MAC.

* **Configurable:** Activa la "Vista Detallada" facilmente desde el panel de configuración de la extensión.

* **Backend Robusto:** Utiliza un script de Python con psutil para obtener información del sistema de manera eficiente y fiable, sin depender de comandos de shell frágiles. 

## Uso

* **Clic Izquierdo:** Haz clic en el indicador del panel para rotar entre la información de red disponible.

* **Configuración:** Abre la aplicación de **Extensiones**, busca "IP Info Bar" y haz clic en el icono de engranaje para acceder a las opciones y activar la Vista Detallada.

---

## Capturas de Pantalla

Modo Simple mostrando la IP LAN y el indicador de SSH activo.

Modo Detallado mostrando la interfaz de red y la dirección MAC.

Ventana de configuración para alternar entre los modos de visualización.

---

## Instalación 

**Instalación desde la web de Extensiones de GNOME (Recomendado)**

> [!NOTE]
> Próximamente...

**Instalación desde el Codigo Fuente(Para Desarrollo)

1. Clona el repositorio en la carpeta de extensiones.
    ```bash
    git clone https://github.com/0gerardo0/IP-Info-Bar.git ~/.local/share/gnome-shell/extensions/ip-info-bar@gerardo.github.io
    ```
2. Copia y compila el esquema de configuración:
    ```bash
    cp ~/.local/share/gnome-shell/extensions/ip-info-bar@gerardo.github.io/schemas/org.gnome.shell.extensions.ip-info-bar.gschema.xml ~/.local/share/glib-2.0/schemas/
    glib-compile-schemas ~/.local/share/glib-2.0/schemas/
    ```
3. Reinicia GNOME Shell(`Alt+F2`, escribe r, y presiona `Enter` en X11) o cierra y vuelve a iniciar sesión en Wayland.

4. **Activar la Extension** con el siguiente comando:
    ```bash
    gnome-extensions enable ip-info-bar@gerardo.github.io
    ```
    También puedes activarla graficamente desde la aplicación **Extensiones**.


## Desarrollo y Depuración 
Para probar cambios en la extensión, especialmente en Wayland, no es necesario reiniciar la sesión constantemente.

1. **Ejecutar un Shell Anidado:** Este comando abre una sesión de GNOME completamente nueva y aislada dentro de una ventana. 

    ```bash
    MUTTER_VIRTUAL_MONITOR=1280x720 dbus-run-session -- gnome-shell --nested --wayland
    ```
2. **Activar y Probar:** Dentro de la ventana anidada, abre una terminal y activa la extensión como se describe en el paso 4 de la instalación. Cualquier cambio que hagas en el codigo se reflejara la proxima vez que lances esta sesión anidada.

3. **Ver Logs:** Para ver los mensajes de `console.log` o errores, ejecuta con este comando en nuna terminal de tu sesión principal:
    ```bash
    journalctl -f -o cat /usr/bin/gnome-shell
    ```

