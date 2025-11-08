#!/usr/bin/env python3
"""
IP Info Bar - Backend Utility Script

This script collects network information including:
- LAN IPv4 and IPv6 addresses
- WAN (public) IPv4 address
- VPN tunnel information (tun0)
- SSH connection status
- Network interface details (interface name, MAC address)

The script outputs JSON data that is consumed by the GNOME Shell extension.
"""
import json
import sys
import os
import urllib.request
import socket

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
try:
    import psutil
except ImportError:
    print(json.dumps({"error": "La librería psutil no fue encontrada."}))
    sys.exit(1)

def get_network_info():
    """
    Retrieves all network IP addresses (IPv4, IPv6, VPN) using psutil.
    
    Returns:
        dict: A dictionary containing:
            - lan_ip4: dict with IPv4 address, interface name, and MAC address
            - lan_ip6: dict with IPv6 address, interface name, and MAC address
            - tun0_vpn: dict with VPN IPv4 address, interface name, and MAC address
    
    Note:
        - Skips loopback (lo) and virtual interfaces (docker, br-, veth)
        - Filters out link-local IPv6 addresses (fe80::)
        - Prioritizes the first non-virtual interface found
    """
    interfaces = psutil.net_if_addrs()
    info = {
        "lan_ip4": None,
        "lan_ip6": None,
        "tun0_vpn": None,
    }
    
    # List of virtual interface prefixes to ignore
    VIRTUAL_IFACE_PREFIXES = ('docker', 'br-', 'veth')

    for iface_name, addrs in interfaces.items():
        # Skip loopback and virtual interfaces
        if iface_name.startswith('lo') or iface_name.startswith(VIRTUAL_IFACE_PREFIXES):
            continue

        ip4_addr, ip6_addr, mac_addr = None, None, None
        
        # Extract addresses from interface
        for addr in addrs:
            if addr.family == socket.AF_INET:
                ip4_addr = addr.address
            elif addr.family == socket.AF_INET6 and not addr.address.startswith('fe80'):
                # Skip link-local IPv6 addresses
                ip6_addr = addr.address
            elif addr.family == socket.AF_PACKET:
                mac_addr = addr.address
    
        # Check for VPN tunnel interface (tun0)
        if iface_name == "tun0" and ip4_addr:
            info["tun0_vpn"] = {
                "address": ip4_addr,
                "interface": iface_name,
                "mac": mac_addr or ""
            }
        
        # Set LAN IPv4 (first non-VPN interface found)
        if ip4_addr and not info["lan_ip4"] and iface_name != 'tun0':
            info["lan_ip4"] = {
                "address": ip4_addr, 
                "interface": iface_name,
                "mac": mac_addr or ""
            }
        
        # Set LAN IPv6 (first non-VPN interface found)
        if ip6_addr and not info["lan_ip6"] and iface_name != 'tun0':
            info["lan_ip6"] = {
                "address": ip6_addr, 
                "interface": iface_name,
                "mac": mac_addr or ""
            }
    return info

def get_wan_ip4():
    """
    Fetches the public WAN IPv4 address using ipify API.
    
    Returns:
        str: The public IPv4 address, or an empty string if the request fails.
    
    Note:
        - Uses a 5-second timeout to prevent hanging
        - Returns empty string on any error (network issues, timeout, etc.)
    """
    try:
        with urllib.request.urlopen("https://api4.ipify.org", timeout=5) as response:
            return response.read().decode("utf-8")
    except Exception:
        # Return empty string on network errors, timeouts, etc.
        return ""

def get_ssh_connections():
    """
    Detects active SSH connections (both incoming and outgoing).
    
    Returns:
        dict: A dictionary containing:
            - has_incoming_ssh: True if there are incoming SSH connections
            - has_remote_ssh: True if there are outgoing SSH connections
    
    Note:
        - Checks ports 22 (standard SSH) and 8022 (alternative SSH port)
        - Only counts ESTABLISHED connections with both local and remote addresses
    """
    ssh_ports = [22, 8022]
    connections = {"has_incoming_ssh": False, "has_remote_ssh": False}
    try:
        net_connections = psutil.net_connections(kind='inet')
        for conn in net_connections:
            if conn.status == 'ESTABLISHED' and conn.raddr and conn.laddr:
                # Incoming SSH: local port is SSH port
                if conn.laddr.port in ssh_ports:
                    connections["has_incoming_ssh"] = True
                # Outgoing SSH: remote port is SSH port
                if conn.raddr.port in ssh_ports:
                    connections["has_remote_ssh"] = True
    except Exception:
        # Silently handle permission errors or other issues
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
