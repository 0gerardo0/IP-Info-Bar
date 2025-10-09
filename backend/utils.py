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
        "lan_ip4": None,
        "lan_ip6": None,
        "tun0_vpn": None,
    }
    
    VIRTUAL_IFACE_PREFIXES = ('docker', 'br-', 'veth')

    for iface_name, addrs in interfaces.items():
        if iface_name.startswith('lo') or iface_name.startswith(VIRTUAL_IFACE_PREFIXES):
            continue

        ip4_addr, ip6_addr, mac_addr = None, None, None
        
        for addr in addrs:
            if addr.family == socket.AF_INET:
                ip4_addr = addr.address
            elif addr.family == socket.AF_INET6 and not addr.address.startswith('fe80'):
                ip6_addr = addr.address
            elif addr.family == socket.AF_PACKET:
                mac_addr = addr.address
    
        if  iface_name == "tun0" and ip4_addr:
            info["tun0_vpn"] = {
                "address": ip4_addr,
                "interface": iface_name,
                "mac": mac_addr or ""
            }
        if ip4_addr and not info["lan_ip4"] and iface_name != 'tun0':
            info["lan_ip4"] = {
                "address": ip4_addr, 
                "interface": iface_name,
                "mac": mac_addr or ""
            }
        if ip6_addr and not info["lan_ip6"] and iface_name != 'tun0':
            info["lan_ip6"] = {
                "address": ip6_addr, 
                "interface": iface_name,
                "mac": mac_addr or ""
            }
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
    except Exception:
        pass
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
