#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request


def post_json(url: str, payload: dict) -> tuple[int, str]:
  data = json.dumps(payload).encode("utf-8")
  req = urllib.request.Request(
    url,
    data=data,
    method="POST",
    headers={"Content-Type": "application/json", "Accept": "application/json"},
  )
  try:
    with urllib.request.urlopen(req, timeout=300) as resp:
      return resp.status, resp.read().decode("utf-8", errors="replace")
  except urllib.error.HTTPError as e:
    return e.code, e.read().decode("utf-8", errors="replace")


def main(argv: list[str]) -> int:
  base = argv[1] if len(argv) > 1 else "http://127.0.0.1:3005/api"
  url = f"{base}/hq/tick/execute"
  status, text = post_json(url, {"type": "manual"})
  print(f"HTTP {status}")
  # Print a short prefix for logs
  print(text[:2000])
  return 0 if 200 <= status < 300 else 1


if __name__ == "__main__":
  raise SystemExit(main(sys.argv))
