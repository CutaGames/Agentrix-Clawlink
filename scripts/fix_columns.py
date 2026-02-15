#!/usr/bin/env python3
"""Generate SQL to rename all camelCase columns to snake_case."""
import subprocess, re, sys

def camel_to_snake(name):
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

# Get all camelCase columns from the DB
result = subprocess.run(
    ['psql', '-U', 'agentrix', '-d', 'paymind', '-t', '-A', '-c',
     "SELECT table_name || '|' || column_name FROM information_schema.columns WHERE table_schema='public' AND column_name ~ '[A-Z]' ORDER BY table_name, column_name;"],
    capture_output=True, text=True
)

lines = [l.strip() for l in result.stdout.strip().split('\n') if '|' in l]
sql_stmts = []
for line in lines:
    parts = line.split('|')
    if len(parts) != 2:
        continue
    table, col = parts
    snake = camel_to_snake(col)
    if snake != col:
        sql_stmts.append(f'ALTER TABLE "{table}" RENAME COLUMN "{col}" TO "{snake}";')

print('BEGIN;')
for s in sql_stmts:
    print(s)
print('COMMIT;')
print(f'-- Total: {len(sql_stmts)} columns to rename', file=sys.stderr)
