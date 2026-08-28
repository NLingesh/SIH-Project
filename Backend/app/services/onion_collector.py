from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from typing import Iterable
from urllib.parse import urljoin, urlparse

import httpx

from app.core.config import settings


class OnionCollectionError(ValueError):
    """Raised when an onion collection request violates the safe crawl policy."""


@dataclass(frozen=True)
class CollectedPage:
    url: str
    status_code: int
    content_type: str
    bytes_read: int
    sha256: str
    title: str | None
    links_found: int
    fetched_at: datetime


class _LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []
        self.title: list[str] = []
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)
        self._in_title = tag.lower() == "title"

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title.append(data.strip())


def _host(url: str) -> str:
    parsed = urlparse(url)
    return (parsed.hostname or "").lower().rstrip(".")


def validate_target(url: str, allowlist: Iterable[str] | None = None) -> str:
    parsed = urlparse(url)
    host = _host(url)
    allowed = {item.lower().rstrip(".") for item in (allowlist if allowlist is not None else settings.onion_allowlist)}
    if parsed.scheme not in {"http", "https"} or not host.endswith(".onion"):
        raise OnionCollectionError("Only http(s) .onion URLs are accepted")
    if not allowed or host not in allowed:
        raise OnionCollectionError("Target is not present in the configured onion allowlist")
    if parsed.username or parsed.password or parsed.port not in {None, 80, 443}:
        raise OnionCollectionError("Credentials and non-standard ports are not allowed")
    return parsed.geturl()


def _same_allowed_host(url: str, root_host: str, allowlist: set[str]) -> bool:
    return _host(url) == root_host and _host(url) in allowlist and urlparse(url).scheme in {"http", "https"}


async def collect_onion_site(seed_url: str, *, max_pages: int | None = None) -> list[CollectedPage]:
    allowlist = set(settings.onion_allowlist)
    root_url = validate_target(seed_url, allowlist)
    root_host = _host(root_url)
    page_limit = min(max_pages or settings.onion_max_pages, settings.onion_max_pages)
    queue = [root_url]
    visited: set[str] = set()
    collected: list[CollectedPage] = []
    timeout = httpx.Timeout(settings.onion_request_timeout_seconds)

    async with httpx.AsyncClient(
        proxy=settings.tor_socks_proxy,
        timeout=timeout,
        follow_redirects=False,
        headers={"User-Agent": "DarkTrace-AuthorizedCollector/1.0"},
    ) as client:
        while queue and len(collected) < page_limit:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)
            try:
                async with client.stream("GET", url) as response:
                    content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
                    if content_type not in {"text/html", "application/xhtml+xml"}:
                        continue
                    content = bytearray()
                    async for chunk in response.aiter_bytes():
                        content.extend(chunk)
                        if len(content) > settings.onion_max_response_bytes:
                            raise OnionCollectionError("Response exceeded configured byte limit")
                    raw = bytes(content)
                    parser = _LinkParser()
                    parser.feed(raw.decode("utf-8", errors="replace"))
                    normalized_links = []
                    for link in parser.links:
                        candidate = urljoin(url, link).split("#", 1)[0]
                        if _same_allowed_host(candidate, root_host, allowlist) and candidate not in visited and candidate not in normalized_links:
                            normalized_links.append(candidate)
                    queue.extend(normalized_links)
                    collected.append(CollectedPage(
                        url=str(response.url),
                        status_code=response.status_code,
                        content_type=content_type,
                        bytes_read=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        title=re.sub(r"\s+", " ", " ".join(parser.title)).strip() or None,
                        links_found=len(normalized_links),
                        fetched_at=datetime.now(timezone.utc),
                    ))
            except OnionCollectionError:
                raise
            except (httpx.HTTPError, UnicodeError):
                continue
    return collected
