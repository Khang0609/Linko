"""URL ingestion with redirect, size, content-type, and SSRF controls."""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import socket
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

import httpcore
from bs4 import BeautifulSoup

from app.analyzer.ingest.base import IngestResult

logger = logging.getLogger(__name__)

MAX_REDIRECTS = 3
MAX_BODY_BYTES = 2 * 1024 * 1024
CONNECT_TIMEOUT = 4.0
MAX_TEXT_CHARS = 20_000
_REDIRECT_STATUSES = {301, 302, 303, 307, 308}
_PARSEABLE_CONTENT_TYPES = {
    "application/json",
    "application/xhtml+xml",
    "text/html",
    "text/plain",
}


class SSRFError(Exception):
    """Raised when a URL can reach a non-public address."""


@dataclass(frozen=True)
class FetchResult:
    status: int
    headers: dict[str, str]
    body: bytes
    too_large: bool = False


class PinnedNetworkBackend(httpcore.AsyncNetworkBackend):
    """Connect to a validated IP while preserving the URL hostname for TLS."""

    def __init__(self, ip: str) -> None:
        self._ip = ip
        self._backend = httpcore.AnyIOBackend()

    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: float | None = None,
        local_address: str | None = None,
        socket_options: list[tuple[int, int, int | bytes]] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        del host
        return await self._backend.connect_tcp(
            self._ip,
            port,
            timeout=timeout,
            local_address=local_address,
            socket_options=socket_options,
        )

    async def connect_unix_socket(
        self,
        path: str,
        timeout: float | None = None,
        socket_options: list[tuple[int, int, int | bytes]] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        return await self._backend.connect_unix_socket(
            path,
            timeout=timeout,
            socket_options=socket_options,
        )

    async def sleep(self, seconds: float) -> None:
        await self._backend.sleep(seconds)


def _check_url(url: str) -> tuple[str, int]:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise SSRFError(f"Blocked scheme: {parsed.scheme}")
    if not parsed.hostname:
        raise SSRFError("URL must include a hostname")
    if parsed.username is not None or parsed.password is not None:
        raise SSRFError("URL credentials are not allowed")
    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError as exc:
        raise SSRFError("Invalid URL port") from exc
    if port not in (80, 443):
        raise SSRFError(f"Blocked URL port: {port}")
    return parsed.hostname, port


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_unspecified
        or ip.is_multicast
        or not ip.is_global
    )


async def _resolve_and_check(hostname: str, port: int) -> tuple[str, ...]:
    """Resolve once, reject any unsafe answer, and return public IPs to pin."""
    try:
        infos = await asyncio.to_thread(
            socket.getaddrinfo,
            hostname,
            port,
            socket.AF_UNSPEC,
            socket.SOCK_STREAM,
        )
    except socket.gaierror as exc:
        raise SSRFError(f"DNS resolution failed for {hostname}") from exc

    addresses = {
        str(ipaddress.ip_address(sockaddr[0]))
        for _family, _type, _proto, _canonname, sockaddr in infos
    }
    if not addresses:
        raise SSRFError(f"DNS returned no addresses for {hostname}")

    for address in addresses:
        ip = ipaddress.ip_address(address)
        if _is_blocked_ip(ip):
            raise SSRFError(f"Blocked IP: {ip}")
    return tuple(sorted(addresses))


async def _fetch_once(
    url: str,
    pinned_ip: str,
    *,
    network_backend: httpcore.AsyncNetworkBackend | None = None,
) -> FetchResult:
    timeout = {
        "connect": CONNECT_TIMEOUT,
        "read": CONNECT_TIMEOUT,
        "write": CONNECT_TIMEOUT,
        "pool": CONNECT_TIMEOUT,
    }
    backend = network_backend or PinnedNetworkBackend(pinned_ip)
    async with httpcore.AsyncConnectionPool(
        network_backend=backend,
        max_connections=1,
        max_keepalive_connections=0,
    ) as pool, pool.stream(
            "GET",
            url,
            headers=[
                (b"user-agent", b"LinkoBot/1.0"),
                (b"accept", b"text/html,text/plain,application/xhtml+xml,application/json"),
                (b"accept-encoding", b"identity"),
            ],
            extensions={"timeout": timeout},
        ) as response:
        headers = {
            key.decode("latin-1").lower(): value.decode("latin-1")
            for key, value in response.headers
        }

        if response.status >= 300:
            return FetchResult(response.status, headers, b"")

        content_encoding = headers.get("content-encoding", "identity").lower()
        media_type = _media_type(headers)
        if (
            content_encoding not in ("", "identity")
            or media_type not in _PARSEABLE_CONTENT_TYPES
        ):
            return FetchResult(response.status, headers, b"")

        content_length = headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_BODY_BYTES:
                    return FetchResult(response.status, headers, b"", too_large=True)
            except ValueError:
                pass

        body = bytearray()
        async for chunk in response.aiter_stream():
            if len(body) + len(chunk) > MAX_BODY_BYTES:
                return FetchResult(response.status, headers, b"", too_large=True)
            body.extend(chunk)
        return FetchResult(response.status, headers, bytes(body))


def _media_type(headers: dict[str, str]) -> str:
    return headers.get("content-type", "").split(";", 1)[0].strip().lower()


def _decode_body(body: bytes, content_type: str) -> str:
    charset = "utf-8"
    for part in content_type.split(";")[1:]:
        key, separator, value = part.strip().partition("=")
        if separator and key.lower() == "charset":
            charset = value.strip().strip('"') or "utf-8"
            break
    try:
        return body.decode(charset, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


def _html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    return " ".join(soup.get_text(separator=" ", strip=True).split())


async def ingest_url(url: str) -> IngestResult:
    """Fetch a public textual URL without allowing DNS rebinding or oversized bodies."""
    warnings: list[str] = []
    current_url = url

    try:
        for redirect_count in range(MAX_REDIRECTS + 1):
            hostname, port = _check_url(current_url)
            pinned_ip = (await _resolve_and_check(hostname, port))[0]
            response = await _fetch_once(current_url, pinned_ip)

            if response.status in _REDIRECT_STATUSES:
                location = response.headers.get("location")
                if not location:
                    warnings.append("INVALID_REDIRECT")
                    return IngestResult(text="", source_type="url", warnings=warnings)
                if redirect_count >= MAX_REDIRECTS:
                    warnings.append(f"MAX_REDIRECTS_EXCEEDED:{MAX_REDIRECTS}")
                    return IngestResult(text="", source_type="url", warnings=warnings)
                current_url = urljoin(current_url, location)
                continue

            if response.status >= 400:
                warnings.append(f"URL_HTTP_ERROR:{response.status}")
                return IngestResult(text="", source_type="url", warnings=warnings)
            if response.status >= 300:
                warnings.append(f"URL_HTTP_STATUS:{response.status}")
                return IngestResult(text="", source_type="url", warnings=warnings)
            if response.too_large:
                warnings.append("BODY_TOO_LARGE")
                return IngestResult(text="", source_type="url", warnings=warnings)

            content_encoding = response.headers.get("content-encoding", "identity").lower()
            if content_encoding not in ("", "identity"):
                warnings.append(f"UNSUPPORTED_CONTENT_ENCODING:{content_encoding}")
                return IngestResult(text="", source_type="url", warnings=warnings)

            media_type = _media_type(response.headers)
            if media_type not in _PARSEABLE_CONTENT_TYPES:
                warnings.append(f"UNSUPPORTED_CONTENT_TYPE:{media_type or 'missing'}")
                return IngestResult(text="", source_type="url", warnings=warnings)

            decoded = _decode_body(response.body, response.headers.get("content-type", ""))
            text = (
                _html_to_text(decoded)
                if media_type in {"text/html", "application/xhtml+xml"}
                else decoded
            )
            text = " ".join(text.split())
            if len(text) > MAX_TEXT_CHARS:
                warnings.append(f"TEXT_TRUNCATED:{len(text)}>{MAX_TEXT_CHARS}")
                text = text[:MAX_TEXT_CHARS]
            return IngestResult(text=text, source_type="url", warnings=warnings)
    except SSRFError:
        raise
    except httpcore.TimeoutException:
        return IngestResult(text="", source_type="url", warnings=["URL_FETCH_TIMEOUT"])
    except (httpcore.NetworkError, httpcore.ProtocolError, httpcore.ProxyError) as exc:
        logger.warning("URL fetch error: %s", type(exc).__name__)
        return IngestResult(
            text="",
            source_type="url",
            warnings=[f"URL_FETCH_ERROR:{type(exc).__name__}"],
        )

    return IngestResult(text="", source_type="url", warnings=["URL_FETCH_ERROR"])
