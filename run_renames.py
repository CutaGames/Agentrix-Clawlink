import subprocess

def run_remote_ssh(command):
    ssh_cmd = f"ssh -i ~/agentrix.pem ubuntu@57.182.89.146 '{command}'"
    print(f"Executing: {ssh_cmd}")
    result = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True)
    return result.stdout, result.stderr

# The SQL to run inside the container
sql_renames = [
    'ALTER TABLE "admin_roles" RENAME COLUMN "createdAt" TO "created_at";',
    'ALTER TABLE "admin_roles" RENAME COLUMN "updatedAt" TO "updated_at";',
    'ALTER TABLE "admin_users" RENAME COLUMN "createdAt" TO "created_at";',
    'ALTER TABLE "admin_users" RENAME COLUMN "updatedAt" TO "updated_at";',
    'ALTER TABLE "admin_logs" RENAME COLUMN "createdAt" TO "created_at";',
    'ALTER TABLE "admin_logs" RENAME COLUMN "updatedAt" TO "updated_at";'
]

for sql in sql_renames:
    # Use double dollar signs for the DO block if needed, but here simple RENAME is enough
    # Wrap in a DO block to avoid errors if column already renamed
    safe_sql = f'DO $$ BEGIN {sql} EXCEPTION WHEN undefined_column THEN NULL; END $$;'
    docker_cmd = f"docker exec -i agentrix-postgres psql -U agentrix -d paymind -c \\\"{safe_sql}\\\""
    out, err = run_remote_ssh(docker_cmd)
    print(f"OUT: {out}")
    print(f"ERR: {err}")
