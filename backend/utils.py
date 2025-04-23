#!/usr/bin/env python3
import subprocess
import json
import re
import sys
import os

def get_tun0_vpn():
    """
    Retorna la IP IPv4 de tun0 si existe.
    Útil para saber la IP de tu VPN.
    """
    try:
        output = subprocess.check_output("ip -4 addr show dev tun0 2>/dev/null", shell=True, text=True)
        match = re.search(r"inet (\d+\.\d+\.\d+\.\d+)", output)
        return match.group(1) if match else ""
    except Exception:
        return ""

def get_lan_ip4():
    """
    Retorna la IP LAN IPv4 real de la ruta por defecto.
    Usa `ip route get 1.1.1.1` para detectar la interfaz.
    """
    try:
        output = subprocess.check_output("ip -4 route get 1.1.1.1 | awk '{print $7}'", shell=True, text=True).strip()
        match = re.search(r"(\d+\.\d+\.\d+\.\d+)", output)
        return match.group(1) if match else ""
    except Exception:
        return ""

def get_lan_ip6():
    """
    Retorna la IP LAN IPv6 real de la ruta por defecto.
    Usa `ip -6 route get 2001::` para detectar la interfaz IPv6.
    """
    try:
        output = subprocess.check_output("ip -6 route get 2001:: | awk '{print $11}'", shell=True, text=True)
        match = re.search(r"([a-fA-F0-9:]+)", output)
        return match.group(1) if match else ""
    except Exception:
        return ""

def get_wan_ip4():
    """
    Retorna la IP pública IPv4 consultando un servicio externo.
    """
    try:
        output = subprocess.check_output("curl -4s https://api64.ipify.org", shell=True, text=True)
        match = re.match(r"\d+\.\d+\.\d+\.\d+", output)
        return output if match else ""
    except Exception:
        return ""

def active_ssh_session_remote():
    """
    Detecta conexiones SSH salientes (cliente remoto).
    Retorna un string con las IPs remotas separadas por comas.
    """
    try:
        resultado = subprocess.run(["ss", "-tp"], capture_output=True, text=True)
        conexiones = []

        for linea in resultado.stdout.splitlines():
            if "ssh" in linea and "ESTAB" in linea:
                match = re.search(r'(\d+\.\d+\.\d+\.\d+):(\d+)\s+(\d+\.\d+\.\d+\.\d+):(\S+)', linea)
                if match:
                    ip_local, port_local, ip_remota, port_remoto = match.groups()
                    conexiones.append({
                        "ip_local": ip_local,
                        "ip_remota": ip_remota,
                        "port_remoto": port_remoto,
                    })
        ips_remotas = [conn["ip_remota"] for conn in conexiones]
        return ", ".join(ips_remotas) if ips_remotas else ""
    except Exception:
        return ""


def active_ssh_incoming_session():
    """
    Detecta sesiones SSH entrantes (servidor SSH).
    Retorna un string con las IPs de los clientes SSH.
    """
    try:
        output = subprocess.check_output(["ss", "-t", "state", "established", "sport", "= :ssh"], text=True)
        conexiones = []
        for line in output.splitlines():
            match = re.search(r'(\d+\.\d+\.\d+\.\d+):ssh\s+(\d+\.\d+\.\d+\.\d+):\d+', line)
            if match:
                ip_local = match.group(1)
                ip_remota = match.group(2)
                conexiones.append({
                    "ip_local": ip_local,
                    "ip_remota": ip_remota
                })
        ips_remotas = [conn['ip_remota'] for conn in conexiones]
        return ", ".join(ips_remotas) if ips_remotas else ""
    except Exception:
        return ""


def boolean_ssh_active_remote():
    """
    Booleano que indica si hay al menos una conexión SSH saliente.
    """
    return bool(active_ssh_session_remote())


def boolean_ssh_incoming_session():
    """
    Booleano que indica si hay al menos una sesión SSH entrante.
    """
    return bool(active_ssh_incoming_session())


def detect_vpn():
    """
    Booleano que indica si hay VPN activa (tun0).
    """
    return bool(get_tun0_vpn())


if __name__ == "__main__":
    try:
        result = {
            "tun0_vpn": get_tun0_vpn(),
            "lan_ip4": get_lan_ip4(),
            "lan_ip6": get_lan_ip6(),
            "wan_ip4": get_wan_ip4(),
            "detect_vpn": detect_vpn(),
            "remote_ssh": active_ssh_session_remote()
        }
        print(json.dumps(result))
        sys.stdout.flush()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
