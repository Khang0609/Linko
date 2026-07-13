"""URL ingestion with SSRF guard — Issue #10.

Security controls:
- HTTP(S) only — reject file://, ftp://, etc.
- DNS resolution → reject loopback, private, link-local, reserved IPs.
- Re-validate IP on each redirect.
- Max 3 redirects, 2 MB body, 4 s connect timeout.
- HTML → plain text via BeautifulSoup.
"""

from __future__ import annotations

import ipaddress
import logging
import socket
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.analyzer.ingest.base import IngestResult

logger = logging.getLogger(__name__)

MAX_REDIRECTS = 3
MAX_BODY_BYTES = 2 * 1024 * 1024  # 2 MB
CONNECT_TIMEOUT = 4.0  # seconds
MAX_TEXT_CHARS = 20_000

_BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


class SSRFError(Exception):
    """Raised when a URL resolves to a blocked IP range."""


def _check_url_scheme(url: str) -> None:
    """Only allow http and https schemes."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise SSRFError(f"Blocked scheme: {parsed.scheme}")


def _resolve_and_check(hostname: str) -> None:
    """Resolve hostname to IP and check against blocked ranges."""
    try:
        infos = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise SSRFError(f"DNS resolution failed for {hostname}") from exc

    for _family, _type, _proto, _canonname, sockaddr in infos:
        ip = ipaddress.ip_address(sockaddr[0])
        for network in _BLOCKED_NETWORKS:
            if ip in network:
                raise SSRFError(f"Blocked IP: {ip} in {network}")


def _html_to_text(html: str) -> str:
    """Strip HTML to plain text using BeautifulSoup."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    # Collapse whitespace
    return " ".join(text.split())


async def ingest_url(url: str) -> IngestResult:
    """Fetch URL content with SSRF protection and convert to plain text."""
    warnings: list[str] = []

    # Validate scheme
    _check_url_scheme(url)

    # Resolve and check the initial hostname
    parsed = urlparse(url)
    if not parsed.hostname:
        raise SSRFError("No hostname in URL")
    _resolve_and_check(parsed.hostname)

    try:
        async with httpx.AsyncClient(
            follow_redirects=False,
            timeout=httpx.Timeout(connect=CONNECT_TIMEOUT, read=CONNECT_TIMEOUT, write=CONNECT_TIMEOUT, pool=5.0),
            max_redirects=0,
        ) as client:
            current_url = url
            for redirect_count in range(MAX_REDIRECTS + 1):
                response = await client.get(current_url, headers={"User-Agent": "LinkoBot/1.0"})

                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        break
                    # Re-validate the redirect target
                    _check_url_scheme(location)
                    redirect_parsed = urlparse(location)
                    if redirect_parsed.hostname:
                        _resolve_and_check(redirect_parsed.hostname)
                    current_url = location

                    if redirect_count >= MAX_REDIRECTS:
                        warnings.append(f"MAX_REDIRECTS_EXCEEDED:{MAX_REDIRECTS}")
                        return IngestResult(text="", source_type="url", warnings=warnings)
                    continue

                # Non-redirect response
                break

            # Check body size
            content_length = response.headers.get("content-length")
            if content_length and int(content_length) > MAX_BODY_BYTES:
                warnings.append(f"BODY_TOO_LARGE:{content_length}")
                return IngestResult(text="", source_type="url", warnings=warnings)

            body = response.text[:MAX_BODY_BYTES]
            text = _html_to_text(body)

            if len(text) > MAX_TEXT_CHARS:
                warnings.append(f"TEXT_TRUNCATED:{len(text)}>{MAX_TEXT_CHARS}")
                text = text[:MAX_TEXT_CHARS]

            return IngestResult(text=text, source_type="url", warnings=warnings)

    except SSRFError:
        raise
    except httpx.TimeoutException:
        warnings.append("URL_FETCH_TIMEOUT")
        return IngestResult(text="", source_type="url", warnings=warnings)
    except httpx.HTTPError as exc:
        logger.warning("URL fetch error: %s", type(exc).__name__)
        warnings.append(f"URL_FETCH_ERROR:{type(exc).__name__}")
        return IngestResult(text="", source_type="url", warnings=warnings)
