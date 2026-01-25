-- Fix audit_logs table to add missing workspaceId column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='workspaceId') THEN
        ALTER TABLE audit_logs ADD COLUMN "workspaceId" UUID;
    END IF;
END $$;
