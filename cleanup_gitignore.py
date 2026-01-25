import os

with open('.gitignore', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

new_lines = []
removed = []
for line in lines:
    clean_line = line.strip()
    if clean_line == 'docs/' or clean_line == 'architecture/' or clean_line == '*.md':
        removed.append(line)
        continue
    new_lines.append(line)

if removed:
    with open('.gitignore', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"Removed lines: {removed}")
else:
    print("No matching lines found.")
