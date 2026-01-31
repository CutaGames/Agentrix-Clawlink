DO $$
DECLARE
    r record;
BEGIN
    -- admin_roles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_roles' AND column_name = 'createdAt') THEN
        ALTER TABLE admin_roles RENAME COLUMN "createdAt" TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_roles' AND column_name = 'updatedAt') THEN
        ALTER TABLE admin_roles RENAME COLUMN "updatedAt" TO updated_at;
    END IF;

    -- admin_users
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'roleId') THEN
        ALTER TABLE admin_users RENAME COLUMN "roleId" TO role_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'passwordHash') THEN
        ALTER TABLE admin_users RENAME COLUMN "passwordHash" TO password_hash;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'fullName') THEN
        ALTER TABLE admin_users RENAME COLUMN "fullName" TO full_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'avatarUrl') THEN
        ALTER TABLE admin_users RENAME COLUMN "avatarUrl" TO avatar_url;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'lastLoginAt') THEN
        ALTER TABLE admin_users RENAME COLUMN "lastLoginAt" TO last_login_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'lastLoginIp') THEN
        ALTER TABLE admin_users RENAME COLUMN "lastLoginIp" TO last_login_ip;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'createdAt') THEN
        ALTER TABLE admin_users RENAME COLUMN "createdAt" TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'updatedAt') THEN
        ALTER TABLE admin_users RENAME COLUMN "updatedAt" TO updated_at;
    END IF;

    -- admin_logs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_logs' AND column_name = 'adminUserId') THEN
        ALTER TABLE admin_logs RENAME COLUMN "adminUserId" TO admin_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_logs' AND column_name = 'resourceType') THEN
        ALTER TABLE admin_logs RENAME COLUMN "resourceType" TO resource_type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_logs' AND column_name = 'resourceId') THEN
        ALTER TABLE admin_logs RENAME COLUMN "resourceId" TO resource_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_logs' AND column_name = 'ipAddress') THEN
        ALTER TABLE admin_logs RENAME COLUMN "ipAddress" TO ip_address;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_logs' AND column_name = 'userAgent') THEN
        ALTER TABLE admin_logs RENAME COLUMN "userAgent" TO user_agent;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_logs' AND column_name = 'createdAt') THEN
        ALTER TABLE admin_logs RENAME COLUMN "createdAt" TO created_at;
    END IF;
END $$;
