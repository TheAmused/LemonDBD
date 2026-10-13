# backend/app/utils/network.py
import ipaddress
import socket


def is_private_host(hostname: str) -> bool:
    """Check whether a hostname points to a private, loopback, or internal address."""
    lower = hostname.lower().strip("[]")
    if lower in ("localhost", "backend", "frontend", "db", "redis", "nginx", "umami"):
        return True
    if lower.endswith(".local") or lower.endswith(".internal"):
        return True

    try:
        ip = ipaddress.ip_address(lower)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_reserved
            or ip.is_unspecified
            or ip.is_link_local
        )
    except ValueError:
        pass

    try:
        addr_infos = socket.getaddrinfo(lower, None)
        if not addr_infos:
            return True
        for info in addr_infos:
            sockaddr = info[4]
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_reserved
                or ip.is_unspecified
                or ip.is_link_local
            ):
                return True
    except (socket.gaierror, ValueError, OSError):
        return True

    return False
