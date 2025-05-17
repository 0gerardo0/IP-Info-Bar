import subprocess
import re
import os

def detectar_conexiones_ssh():
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

    return conexiones

for conn in detectar_conexiones_ssh():
    print(f"SSH activo → Local: {conn['ip_local']} ↔ Remoto: {conn['ip_remota']}")




def get_ssh_incoming_ipsggg():
    try:
        output = subprocess.check_output(["ss", "-t", "state", "established", "sport", "= :ssh"], text=True)
        conexiones = []
        for line in output.splitlines():
            match = re.search(r'\d+\.\d+\.\d+\.\d+:ssh\s+(\d+\.\d+\.\d+\.\d+):\d+', line)
            if match:
                remote_ip = match.group(1)
                conexiones.append(remote_ip)
        return conexiones
    except Exception:
        return []

def ssh_incoming_connections():
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
        print("📡 IPs remotas detectadas:", ips_remotas)

        return ", ".join(ips_remotas) if ips_remotas else ""
    except Exception as e:
        print(f"Error al detectar conexiones SSH entrantes: {e}")
        return ""

def is_ssh_incoming_active():
    return bool(get_ssh_incoming_ipsggg())


def get_tun0_vpn4():
    """
    Retorna la IP IPv4 de tun0 si existe (VPN).
    """
    try:
        output = subprocess.check_output(
            "ip -4 addr show dev tun0 2>/dev/null", shell=True, text=True
        )
        match = re.search(r"inet (\d+\.\d+\.\d+\.\d+)", output)
        return match.group(1) if match else ""
    except Exception:
        return ""


def get_tun0_vpn6():
    """
    Retorna la IP IPv6 de tun0 si existe.
    """
    try:
        output = subprocess.check_output(
            "ip -6 addr show dev tun0 2>/dev/null", shell=True, text=True
        )
        match = re.search(r"inet6 ([a-fA-F0-9:]+)", output)
        return match.group(1) if match else ""
    except Exception:
        return ""


def detect_vpn():
    """
    Indica si hay VPN activa (tun0).
    """
    return bool(get_tun0_vpn4()) or bool(get_tun0_vpn6())


def get_real_lan_ip4():
    """
    Obtiene la IP LAN IPv4 real de la interfaz física (excluye tun0 y lo).
    """
    try:
        cmd = "ip -4 addr show scope global | grep -Ev ' lo | tun0 '"
        output = subprocess.check_output(cmd, shell=True, text=True)
        match = re.search(r"inet (\d+\.\d+\.\d+\.\d+)", output)
        return match.group(1) if match else ""
    except Exception:
        return ""


def get_lan_ip4(prefer_real=False):
    """
    Devuelve IP LAN IPv4. Si hay VPN y prefer_real=False, retorna VPN;
    de lo contrario, retorna la IP LAN real.
    """
    vpn_ip = get_tun0_vpn4()
    if vpn_ip and not prefer_real:
        return vpn_ip
    return get_real_lan_ip4()


def get_real_lan_ip6():
    """
    Obtiene la IP LAN IPv6 real de la interfaz física (excluye tun0 y lo).
    """
    try:
        cmd = "ip -6 addr show scope global | grep -Ev ' lo | tun0 '"
        output = subprocess.check_output(cmd, shell=True, text=True)
        match = re.search(r"inet6 ([a-fA-F0-9:]+)", output)
        return match.group(1) if match else ""
    except Exception:
        return ""


def get_lan_ip6(prefer_real=False):
    """
    Devuelve IP LAN IPv6. Si hay VPN IPv6 y prefer_real=False, retorna VPN;
    de lo contrario, retorna la IP LAN real.
    """
    vpn6 = get_tun0_vpn6()
    if vpn6 and not prefer_real:
        return vpn6
    return get_real_lan_ip6()


if __name__ == "__main__":
    print ("Hola mundo")