#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request


DEFAULT_BASE = "http://127.0.0.1:3005/api"


MODEL_PLAN: dict[str, dict[str, str]] = {
  # High-frequency core agents -> max quota model
  "COMMANDER-01": {"provider": "gemini", "model": "gemini-2.0-flash"},
  "ANALYST-01": {"provider": "gemini", "model": "gemini-2.0-flash"},
  "REVENUE-01": {"provider": "gemini", "model": "gemini-2.0-flash"},
  "GROWTH-01": {"provider": "gemini", "model": "gemini-2.0-flash"},
  "BD-01": {"provider": "gemini", "model": "gemini-2.0-flash"},
  "SOCIAL-01": {"provider": "gemini", "model": "gemini-2.0-flash"},
  "CONTENT-01": {"provider": "gemini", "model": "gemini-2.0-flash"},
  "DEVREL-01": {"provider": "gemini", "model": "gemini-2.0-flash"},

  # Light agents -> lite model
  "SUPPORT-01": {"provider": "gemini", "model": "gemini-2.0-flash-lite"},
  "SECURITY-01": {"provider": "gemini", "model": "gemini-2.0-flash-lite"},
  "LEGAL-01": {"provider": "gemini", "model": "gemini-2.0-flash-lite"},
  "ARCHITECT-01": {"provider": "gemini", "model": "gemini-2.0-flash-lite"},
  "CODER-01": {"provider": "gemini", "model": "gemini-2.0-flash-lite"},
}


def http_json(method: str, url: str, body: dict | None = None) -> tuple[int, str]:
  data = None
  headers = {"Accept": "application/json"}
  if body is not None:
    raw = json.dumps(body).encode("utf-8")
    data = raw
    headers["Content-Type"] = "application/json"

  req = urllib.request.Request(url, data=data, method=method, headers=headers)
  try:
    with urllib.request.urlopen(req, timeout=30) as resp:
      return resp.status, resp.read().decode("utf-8", errors="replace")
  except urllib.error.HTTPError as e:
    return e.code, e.read().decode("utf-8", errors="replace")


def main(argv: list[str]) -> int:
  base = argv[1] if len(argv) > 1 else DEFAULT_BASE
  ok = 0
  fail = 0

  for code, cfg in MODEL_PLAN.items():
    url = f"{base}/hq/agents/{code}/model"
    status, text = http_json("PUT", url, cfg)
    if 200 <= status < 300:
      ok += 1
      print(f"OK  {code} -> {cfg['provider']} / {cfg['model']}")
    else:
      fail += 1
      print(f"FAIL {code} status={status} body={text[:200]}")

  print(f"\nDone. ok={ok} fail={fail}")
  return 0 if fail == 0 else 1


if __name__ == "__main__":
  raise SystemExit(main(sys.argv))
