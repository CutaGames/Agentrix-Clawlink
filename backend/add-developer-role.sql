-- Add developer role to users_roles_enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'developer' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_roles_enum')
    ) THEN
        ALTER TYPE users_roles_enum ADD VALUE 'developer';
    END IF;
END
$$;
