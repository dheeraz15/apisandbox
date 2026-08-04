"""DNS verification helpers for custom workspace domains."""

from __future__ import annotations

import secrets
import socket
from urllib.parse import urlparse

from django.conf import settings


def generate_verification_token() -> str:
    return f"mockapi-verify-{secrets.token_hex(12)}"


def cname_target() -> str:
    configured = getattr(settings, "CUSTOM_DOMAIN_CNAME_TARGET", "") or ""
    if configured:
        return configured.strip().lower().rstrip(".")
    base = getattr(settings, "SANDBOX_BASE_URL", "http://localhost:8000")
    host = urlparse(base).hostname or "localhost"
    return host.lower().rstrip(".")


def platform_hosts() -> set[str]:
    hosts = {cname_target(), "localhost", "127.0.0.1"}
    for h in getattr(settings, "ALLOWED_HOSTS", []) or []:
        if h and h != "*":
            hosts.add(h.lower().lstrip("."))
    base = getattr(settings, "SANDBOX_BASE_URL", "")
    parsed = urlparse(base).hostname
    if parsed:
        hosts.add(parsed.lower())
    return hosts


def _normalize_host(value: str) -> str:
    return value.strip().lower().rstrip(".")


def _lookup_cname(domain: str) -> list[str]:
    try:
        import dns.resolver

        answers = dns.resolver.resolve(domain, "CNAME")
        return [_normalize_host(str(r.target)) for r in answers]
    except Exception:
        return []


def _lookup_txt(name: str) -> list[str]:
    try:
        import dns.resolver

        answers = dns.resolver.resolve(name, "TXT")
        values: list[str] = []
        for rdata in answers:
            # TXT rdata.strings is a tuple of bytes/str chunks
            parts = getattr(rdata, "strings", None)
            if parts:
                joined = "".join(
                    p.decode("utf-8", errors="ignore") if isinstance(p, bytes) else str(p)
                    for p in parts
                )
                values.append(joined.strip().strip('"'))
            else:
                values.append(str(rdata).strip().strip('"'))
        return values
    except Exception:
        return []


def _lookup_a(domain: str) -> list[str]:
    try:
        import dns.resolver

        answers = dns.resolver.resolve(domain, "A")
        return [str(r.address) for r in answers]
    except Exception:
        try:
            return list({ai[4][0] for ai in socket.getaddrinfo(domain, None, type=socket.SOCK_STREAM)})
        except Exception:
            return []


def platform_ips() -> set[str]:
    ips: set[str] = set()
    for host in platform_hosts():
        if host in ("localhost", "127.0.0.1"):
            ips.add("127.0.0.1")
            continue
        ips.update(_lookup_a(host))
    return ips


def verify_domain_dns(domain: str, token: str) -> tuple[bool, str]:
    """
    Verify domain ownership via:
    1) CNAME domain → CUSTOM_DOMAIN_CNAME_TARGET
    2) TXT _mockapi-verify.<domain> == token
    3) A record matching platform IP (Cloudflare CNAME flattening)
    """
    domain = _normalize_host(domain)
    target = cname_target()
    token = (token or "").strip()

    cnames = _lookup_cname(domain)
    if any(c == target or c.endswith("." + target) for c in cnames):
        return True, f"CNAME points to {target}"

    txt_name = f"_mockapi-verify.{domain}"
    txts = _lookup_txt(txt_name)
    if token and token in txts:
        return True, f"TXT record verified at {txt_name}"

    # Cloudflare orange-cloud often flattens CNAME → A
    domain_ips = set(_lookup_a(domain))
    plat_ips = platform_ips()
    if domain_ips and plat_ips and domain_ips & plat_ips:
        return True, "A record matches platform IP (CNAME likely flattened)"

    hints = [
        f"Add a CNAME for {domain} → {target}",
        f"Or add TXT {txt_name} = {token}",
    ]
    if cnames:
        hints.append(f"Found CNAME(s): {', '.join(cnames)}")
    elif domain_ips:
        hints.append(f"Found A record(s): {', '.join(sorted(domain_ips))}")
    else:
        hints.append("No CNAME/A/TXT records found yet (DNS may still be propagating)")

    return False, " · ".join(hints)
