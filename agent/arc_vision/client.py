"""Thin client for the arc-tracker HTTP API."""

from __future__ import annotations

import requests


class TrackerClient:
    def __init__(self, base_url: str, timeout: float = 10.0):
        self.base = base_url.rstrip("/")
        self.timeout = timeout
        self.http = requests.Session()
        self.http.headers["User-Agent"] = "arc-vision/1.0"

    def _get(self, path: str, **kw):
        r = self.http.get(self.base + path, timeout=self.timeout, **kw)
        r.raise_for_status()
        return r

    def health(self) -> dict:
        return self._get("/health").json()

    def characters(self) -> list[dict]:
        return self._get("/api/characters").json()

    def catalog(self) -> dict:
        return self._get("/api/vision/catalog").json()

    def icon_bytes(self, icon_url: str) -> bytes:
        return self._get(icon_url).content

    def sync(self, character_id: int, counts: dict[str, int], apply: bool) -> dict:
        """counts maps 'type:id' → total count seen."""
        items = []
        for key, count in counts.items():
            t, i = key.split(":", 1)
            items.append({"type": t, "id": int(i), "count": int(count)})
        r = self.http.post(
            self.base + "/api/vision/sync",
            json={"character_id": character_id, "items": items, "apply": apply, "source": "arc-vision"},
            timeout=self.timeout,
        )
        if r.status_code >= 400:
            try:
                msg = r.json().get("error", r.text)
            except ValueError:
                msg = r.text
            raise RuntimeError(f"sync failed ({r.status_code}): {msg}")
        return r.json()
