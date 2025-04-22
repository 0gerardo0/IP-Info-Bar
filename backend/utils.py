#!/usr/bin/env python3
import subprocess
import json
import re
import sys

def get_tun0_vpn():
    try:
        output = subprocess.check_output("ip -4 addr show dev tun0 2>/dev/null", shell=True, text=True)
        match = re.search(r"inet (\d+\.\d+\.\d+\.\d+)", output)
        return match.group(1) if match else ""
    except Exception:
        return ""

def get_lan_ip4():
    try:
        output = subprocess.check_output("ip -4 route get 1.1.1.1 | awk '{print $7}'", shell=True, text=True).strip()
        match = re.search(r"(\d+\.\d+\.\d+\.\d+)", output)
        return match.group(1) if match else ""
    except Exception:
        return ""

def get_lan_ip6():
    try:
        output = subprocess.check_output("ip -6 route get 2001:: | awk '{print $11}'", shell=True, text=True)
        match = re.search(r"([a-fA-F0-9:]+)", output)
        return match.group(1) if match else ""
    except Exception:
        return ""

def get_wan_ip4():
    try:
        output = subprocess.check_output("curl -4s https://api64.ipify.org", shell=True, text=True)
        match = re.match(r"\d+\.\d+\.\d+\.\d+", output)
        return output if match else ""
    except Exception:
        return ""

if __name__ == "__main__":
    try:
        result = {
            "tun0_vpn": get_tun0_vpn(),
            "lan_ip4": get_lan_ip4(),
            "lan_ip6": get_lan_ip6(),
            "wan_ip4": get_wan_ip4()
        }
        print(json.dumps(result))
        sys.stdout.flush()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
