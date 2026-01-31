import os

files_to_patch = [
    'Agentrix/backend/src/migrations/1768743398996-fix-missing-columns.ts',
    'Agentrix/backend/src/migrations/1774000000000-AddDeveloperRoleToEnum.ts'
]

for path in files_to_patch:
    if os.path.exists(path):
        with open(path, 'r') as f:
            lines = f.readlines()
        
        # Check if already patched
        if any('return;' in line and 'public async up' in lines[max(0, lines.index(line)-1)] for line in lines):
            print(f'{path} already patched')
            continue
            
        new_lines = []
        for line in lines:
            new_lines.append(line)
            if 'public async up(queryRunner: QueryRunner): Promise<void> {' in line:
                new_lines.append('        return;\n')
        
        with open(path, 'w') as f:
            f.writelines(new_lines)
        print(f'Successfully patched {path}')
    else:
        print(f'File not found: {path}')
