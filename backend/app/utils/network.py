# backend/app/utils/network.py
import ipaddress
import socket

#: Docker service names and other hosts that only exist inside our network.
_INTERNAL_HOSTNAMES = frozenset({"localhost", "backend", "frontend", "db", "redis", "nginx", "umami"})


def is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """True for any address an outbound fetch must never reach."""
    mapped = getattr(ip, "ipv4_mapped", None)
    if mapped is not None:
        ip = mapped
    return (
        ip.is_private
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
