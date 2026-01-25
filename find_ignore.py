import os

with open('.gitignore', 'rb') as f:
    content = f.read()
    print(f"File size: {len(content)}")
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if b'docs' in line or b'architecture' in line:
            print(f"Line {i+1}: {line}")
