-- admin_roles
ALTER TABLE admin_roles RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE admin_roles RENAME COLUMN "updatedAt" TO updated_at;

-- admin_users
ALTER TABLE admin_users RENAME COLUMN "roleId" TO role_id;
ALTER TABLE admin_users RENAME COLUMN "passwordHash" TO password_hash;
ALTER TABLE admin_users RENAME COLUMN "fullName" TO full_name;
ALTER TABLE admin_users RENAME COLUMN "avatarUrl" TO avatar_url;
ALTER TABLE admin_users RENAME COLUMN "lastLoginAt" TO last_login_at;
ALTER TABLE admin_users RENAME COLUMN "lastLoginIp" TO last_login_ip;
ALTER TABLE admin_users RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE admin_users RENAME COLUMN "updatedAt" TO updated_at;

-- admin_logs
ALTER TABLE admin_logs RENAME COLUMN "adminUserId" TO admin_user_id;
ALTER TABLE admin_logs RENAME COLUMN "resourceType" TO resource_type;
ALTER TABLE admin_logs RENAME COLUMN "resourceId" TO resource_id;
ALTER TABLE admin_logs RENAME COLUMN "ipAddress" TO ip_address;
ALTER TABLE admin_logs RENAME COLUMN "userAgent" TO user_agent;
ALTER TABLE admin_logs RENAME COLUMN "createdAt" TO created_at;
