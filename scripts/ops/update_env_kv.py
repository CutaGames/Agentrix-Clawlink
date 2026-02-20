#!/usr/bin/env python3

from __future__ import annotations

import sys
from pathlib import Path


def parse_kv(arg: str) -> tuple[str, str]:
  if "=" not in arg:
    raise ValueError(f"Invalid KEY=VALUE: {arg}")
  key, value = arg.split("=", 1)
  key = key.strip()
  if not key:
    raise ValueError(f"Empty key in: {arg}")
  return key, value


def main(argv: list[str]) -> int:
  if len(argv) < 3:
    print("Usage: update_env_kv.py /path/to/.env KEY=VALUE [KEY=VALUE ...]", file=sys.stderr)
    return 2

  env_path = Path(argv[1])
  updates = dict(parse_kv(a) for a in argv[2:])

  if env_path.exists():
    original_lines = env_path.read_text(encoding="utf-8").splitlines(keepends=False)
  else:
    original_lines = []

  seen: set[str] = set()
  out_lines: list[str] = []

  for line in original_lines:
    stripped = line.strip()
    if not stripped or stripped.startswith('#') or '=' not in line:
      out_lines.append(line)
      continue

    key = line.split('=', 1)[0].strip()
    if key in updates and key not in seen:
      out_lines.append(f"{key}={updates[key]}")
      seen.add(key)
      continue

    if key in updates and key in seen:
      continue

    out_lines.append(line)

  missing = [k for k in updates.keys() if k not in seen]
  if missing:
    if out_lines and out_lines[-1].strip() != '':
      out_lines.append('')
    out_lines.append('# --- Copilot-managed HQ runtime tuning ---')
    for k in missing:
      out_lines.append(f"{k}={updates[k]}")

  env_path.parent.mkdir(parents=True, exist_ok=True)
  env_path.write_text('\n'.join(out_lines) + '\n', encoding='utf-8')
  return 0


if __name__ == '__main__':
  raise SystemExit(main(sys.argv))
