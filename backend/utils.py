#!/usr/bin/env python3
import json
import sys
import os
import urllib.request
import socket

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
try:
    import psutil
except ImportError:
    print(json.dumps({"error": "La libreria psutilno fue encontrada."}))
    sys.exit(1)

def get_network_info():
    """
    Obtiene todas las IPs (IPv4, IPv6, VPN) usando psutil.
    """
    interfaces = psutil.net_if_addrs()
    info = {
        "tun0_vpn": "",
        "lan_ip4": "",
        "lan_ip6": ""
    }
    
    if "tun0" in interfaces:
        for addr in interfaces["tun0"]:
            if addr.family == socket.AF_INET:
                info ["tun0_vpn"] = addr.address
                break

    for iface_name, addrs in interfaces.items():
        if iface_name.startswith('lo') or iface_name == 'tun0':
            continue
        
        for addr in addrs:
            if addr.family == socket.AF_INET and not info["lan_ip4"]:
                info["lan_ip4"] = addr.address
            elif addr.family == socket.AF_INET6 and not addr.address.startswith('fe80') and not info["lan_ip6"]:
                info["lan_ip6"] = addr.address
    return info

def get_wan_ip4():
    try:
        with urllib.request.urlopen("https://api4.ipify.org", timeout=5) as response:
            return response.read().decode("utf-8")
    except Exception:
        return ""

def get_ssh_connections():
    ssh_ports = [22, 8022]
    connections = {"has_incoming_ssh": False, "has_remote_ssh": False}
    try:
        net_connections = psutil.net_connections(kind='inet')
        for conn in net_connections:
            if conn.status == 'ESTABLISHED' and conn.raddr and conn.laddr:
                if conn.laddr.port in ssh_ports:
                    connections["has_incoming_ssh"] = True
                if conn.raddr.port in ssh_ports:
                    connections["has_remote_ssh"] = True
        return connections
    except Exception:
        return connections

if __name__ == "__main__":
    try:
        network_ips = get_network_info()
        ssh_status = get_ssh_connections()
        result = {
            "tun0_vpn": network_ips.get("tun0_vpn"),
            "lan_ip4": network_ips.get("lan_ip4"),
            "lan_ip6": network_ips.get("lan_ip6"),
            "wan_ip4": get_wan_ip4(),
            "detect_vpn": bool(network_ips.get("tun0_vpn")),
            "has_remote_ssh": ssh_status.get("has_remote_ssh"),
            "has_incoming_ssh": ssh_status.get("has_incoming_ssh")
        }
        print(json.dumps(result))
        sys.stdout.flush()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
