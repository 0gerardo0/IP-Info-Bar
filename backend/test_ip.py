import utils as ip

def test_all():
    print("TUN0:    ", ip.get_tun0_vpn() or "No encontrado")
    print("LAN IP4: ", ip.get_lan_ip4() or "No encontrado")
    print("LAN IP6: ", ip.get_lan_ip6() or "No encontrado")
    print("WAN IP4: ", ip.get_wan_ip4() or "No encontrado")

if __name__ == "__main__":
    test_all()

