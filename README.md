# IP Info Bar – GNOME Shell Extension

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
![GNOME Shell](https://img.shields.io/badge/GNOME-45+-important)
![Status](https://img.shields.io/badge/status-alpha-orange)

Una extensión de GNOME Shell que muestra información de red directamente en la barra superior. Alterna dinámicamente entre diferentes tipos de direcciones IP: LAN, WAN, IPv6, y VPN. Pensada para entornos técnicos donde la visibilidad inmediata de la conectividad es crítica.

---

## Características actuales

-  Muestra la IP LAN (IPv4).
-  Muestra la IP pública (WAN).
-  Muestra la dirección IPv6 local.
-  Detecta y muestra la IP del túnel VPN (`tun0`).
-  Backend en Python para consultas del sistema en tiempo real.

---

## Características futuras (en desarrollo)

Estas funcionalidades ya están implementadas en el backend (`utils.py`) y serán integradas progresivamente en la UI:

- **Detección de sesiones SSH activas:**
  - Entrantes (actuando como servidor).
  - Salientes (actuando como cliente).
-  **Detección activa de VPN (`tun0`) como booleano.**
-  **Modo experto:** Mostrar múltiples IPs simultáneamente o como tooltip expandible.
-  **Opciones de configuración personalizadas desde `prefs.js`.**
-  Sistema de testeo modular para comandos shell fallidos o entorno sin red.

---

## Capturas de pantalla

---

## Instalación

1. Clona este repositorio dentro de tu carpeta de extensiones:
   ```bash
   git clone https://github.com/0gerardo0/ip-info-bar.git ~/.local/share/gnome-shell/extensions/ip-info-bar@gerardo0.github.io

