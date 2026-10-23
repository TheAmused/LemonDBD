# backend/app/utils/network.py
import ipaddress
import socket

#: Docker service names and other hosts that only exist inside our network.
_INTERNAL_HOSTNAMES = frozenset({"localhost", "backend", "frontend", "db", "redis", "nginx", "umami"})


#: The NAT64 well-known prefix: 64:ff9b::a.b.c.d reaches the IPv4 address a.b.c.d through a translator.
_NAT64 = ipaddress.ip_network("64:ff9b::/96")


def _embedded_ipv4(ip: ipaddress.IPv6Address) -> list[ipaddress.IPv4Address]:
    """IPv4 addresses an IPv6 address carries (mapped, NAT64, 6to4, Teredo) -- each a way to reach v4."""
    found = [a for a in (ip.ipv4_mapped, ip.sixtofour) if a is not None]
    if ip.teredo:
        found.extend(ip.teredo)
    if ip in _NAT64:
        found.append(ipaddress.IPv4Address(int(ip) & 0xFFFFFFFF))
    return found


def is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """True for any address an outbound fetch must never reach.

    Anything that is not globally routable is blocked -- private, loopback, link-local, reserved,
    unspecified, and the ranges those checks miss, such as carrier-grade NAT (100.64.0.0/10) and
    benchmarking or documentation nets -- plus multicast, and any IPv6 address that embeds a blocked
    IPv4 address.
    """
    if isinstance(ip, ipaddress.IPv6Address) and any(is_blocked_ip(v4) for v4 in _embedded_ipv4(ip)):
        return True
    return (
        not ip.is_global
        or ip.is_private
        or ip.is_loopback
        or ip.is_reserved
        or ip.is_unspecified
        or ip.is_link_local
        or ip.is_multicast
    )


def resolve_public_addresses(hostname: str) -> list[str]:
    """Every address `hostname` resolves to, or [] if it is internal, does not
    resolve, or ANY of its addresses is private.

    Callers must connect to one of the returned addresses rather than resolving
    the name again: a second lookup is what DNS rebinding exploits (public
    answer for the check, private answer for the connection).
    """
    lower = hostname.lower().strip("[]")
    if lower in _INTERNAL_HOSTNAMES or lower.endswith(".local") or lower.endswith(".internal"):
        return []
    try:
        return [] if is_blocked_ip(ipaddress.ip_address(lower)) else [lower]
    except ValueError:
        pass
    try:
        infos = socket.getaddrinfo(lower, None)
    except (socket.gaierror, UnicodeError, OSError):
        return []
    addresses: list[str] = []
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            return []
        if is_blocked_ip(ip):
            return []
        if str(ip) not in addresses:
            addresses.append(str(ip))
    return addresses


def is_private_host(hostname: str) -> bool:
    """Check whether a hostname points to a private, loopback, or internal address."""
    return not resolve_public_addresses(hostname)
