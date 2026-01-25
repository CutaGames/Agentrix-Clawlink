import os
import re

entities_dir = 'backend/src/entities'

def to_snake_case(name):
    # Standard snake_case conversion
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-0])([A-Z])', r'\1_\2', s1).lower()

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    modified = False

    # 1. Handle @Column({ name: '...' })
    # This regex attempts to find @Column with a name property and then the property name following it.
    # It handles basic cases.
    def column_replace(match):
        options_full = match.group(1)
        name_val = match.group(2)
        prop_name = match.group(3)
        
        # Check if name_val is snake_case of prop_name or matches prop_name exactly
        # or if name_val is camelCase and matches prop_name
        if name_val == prop_name or name_val == to_snake_case(prop_name):
            # Remove name: '...' from options
            # Match name: '...' with optional trailing comma or leading comma
            new_options = re.sub(r"name:\s*['\"].*?['\"]\s*,?", "", options_full)
            new_options = new_options.strip()
            # Clean up trailing/leading commas from the sub
            new_options = new_options.strip(',')
            new_options = re.sub(r',\s*,', ',', new_options).strip()
            
            if not new_options or new_options.strip() == '':
                return f"@Column()\n  {prop_name}"
            else:
                # Wrap options back
                return f"@Column({{ {new_options.strip()} }})\n  {prop_name}"
        return match.group(0)

    # Regex for @Column and others
    # Captures: 0=decorator name, 1=content inside {}, 2=name value, 3=property name
    pattern = r"@(Column|CreateDateColumn|UpdateDateColumn|DeleteDateColumn|PrimaryColumn)\(\{([^}]*?name:\s*['\"]([^'\"]+)['\"][^}]*)\}\)\s+(?:public|private|protected|readonly|get|set)?\s*(\w+)"
    
    def column_replace(match):
        decorator = match.group(1)
        options_full = match.group(2)
        name_val = match.group(3)
        prop_name = match.group(4)
        
        if name_val == prop_name or name_val == to_snake_case(prop_name):
            new_options = re.sub(r"name:\s*['\"].*?['\"]\s*,?", "", options_full)
            new_options = new_options.strip().strip(',')
            new_options = re.sub(r',\s*,', ',', new_options).strip()
            
            if not new_options or new_options.strip() == '':
                return f"@{decorator}()\n  {prop_name}"
            else:
                return f"@{decorator}({{ {new_options.strip()} }})\n  {prop_name}"
        return match.group(0)

    content = re.sub(pattern, column_replace, content, flags=re.DOTALL)

    # 2. Handle @JoinColumn({ name: '...' })
    # The user specifically wants to simplify these to @JoinColumn() if they are camelCase or match common patterns.
    # Pattern: @JoinColumn({ name: 'userId' }) -> @JoinColumn()
    join_pattern = r"@JoinColumn\(\{\s*name:\s*['\"](\w+)['\"]\s*\}\)"
    content = re.sub(join_pattern, r"@JoinColumn()", content)

    # 3. Handle @Index(['prop_name'])
    # First, collect all property names in the class to create a mapping from snake_case to camelCase.
    all_props = re.findall(r"(?:public|private|protected|readonly)?\s*(\w+)\s*[:;=]", content)
    prop_map = {to_snake_case(p): p for p in all_props}
    
    def index_replace(match):
        idx_content = match.group(1)
        # Find all quoted strings in the array
        props_in_idx = re.findall(r"['\"](\w+)['\"]", idx_content)
        new_props = []
        for p in props_in_idx:
            if p in prop_map and p != prop_map[p]:
                new_props.append(f"'{prop_map[p]}'")
            else:
                new_props.append(f"'{p}'")
        
        return f"@Index([{', '.join(new_props)}])"

    index_pattern = r"@Index\(\[([^\]]+)\]\)"
    content = re.sub(index_pattern, index_replace, content)

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

fixed_files = []
for filename in os.listdir(entities_dir):
    if filename.endswith('.entity.ts'):
        # Skip files that might not be entities or if there's an error
        try:
            if process_file(os.path.join(entities_dir, filename)):
                fixed_files.append(filename)
        except Exception as e:
            print(f"Error processing {filename}: {e}")

print(f"Fixed {len(fixed_files)} files:")
for f in fixed_files:
    print(f"- {f}")
