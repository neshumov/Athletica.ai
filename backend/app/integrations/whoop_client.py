from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings


@dataclass
class WhoopToken:
    access_token: str
    refresh_token: str | None
    expires_in: int
    scope: str
    token_type: str


class WhoopClient:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://api.prod.whoop.com/developer"

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"}

    def get_cycles(self, start: str | None = None, end: str | None = None) -> dict[str, Any]:
        params = {"limit": 25}
        if start:
            params["start"] = start
        if end:
            params["end"] = end
        with httpx.Client(timeout=30) as client:
            resp = client.get(
                f"{self.base_url}/v2/cycle", headers=self._headers(), params=params
            )
            resp.raise_for_status()
            return resp.json()


def exchange_code_for_token(code: str) -> WhoopToken:
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": settings.whoop_client_id,
        "client_secret": settings.whoop_client_secret,
        "redirect_uri": settings.whoop_redirect_url,
    }
    with httpx.Client(timeout=30) as client:
        resp = client.post(str(settings.whoop_token_url), data=payload)
        resp.raise_for_status()
        data = resp.json()
    return WhoopToken(
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token"),
        expires_in=data["expires_in"],
        scope=data.get("scope", ""),
        token_type=data.get("token_type", "bearer"),
    )


def refresh_access_token(refresh_token: str) -> WhoopToken:
    payload = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": settings.whoop_client_id,
        "client_secret": settings.whoop_client_secret,
        "scope": "offline",
    }
    with httpx.Client(timeout=30) as client:
        resp = client.post(str(settings.whoop_token_url), data=payload)
        resp.raise_for_status()
        data = resp.json()
    return WhoopToken(
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token"),
        expires_in=data["expires_in"],
        scope=data.get("scope", ""),
        token_type=data.get("token_type", "bearer"),
    )
