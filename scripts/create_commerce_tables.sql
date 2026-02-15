-- Create commerce tables with snake_case columns (matching SnakeNamingStrategy)
-- Run on production: psql -U agentrix -d paymind -f create_commerce_tables.sql

-- ENUM types
DO $$ BEGIN
  CREATE TYPE "split_plan_status_enum" AS ENUM('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "split_plan_product_type_enum" AS ENUM('physical', 'service', 'virtual', 'nft', 'skill', 'agent_task');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "budget_pool_status_enum" AS ENUM('draft', 'funded', 'active', 'depleted', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "funding_source_enum" AS ENUM('payment', 'wallet', 'credit');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "milestone_status_enum" AS ENUM('pending', 'in_progress', 'pending_review', 'approved', 'rejected', 'released');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "approval_type_enum" AS ENUM('auto', 'manual', 'quality_gate');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- split_plans table
CREATE TABLE IF NOT EXISTS "split_plans" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" varchar(100) NOT NULL,
  "description" text,
  "version" integer NOT NULL DEFAULT 1,
  "product_type" "split_plan_product_type_enum" NOT NULL DEFAULT 'service',
  "rules" jsonb NOT NULL DEFAULT '[]',
  "fee_config" jsonb NOT NULL DEFAULT '{"onrampFeeBps": 10, "offrampFeeBps": 10, "splitFeeBps": 30, "minSplitFee": 100000}',
  "tiers" jsonb,
  "caps" jsonb,
  "status" "split_plan_status_enum" NOT NULL DEFAULT 'draft',
  "is_system_template" boolean NOT NULL DEFAULT false,
  "owner_id" uuid,
  "usage_count" integer NOT NULL DEFAULT 0,
  "metadata" jsonb,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_split_plans" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_split_plans_owner_status" ON "split_plans" ("owner_id", "status");
CREATE INDEX IF NOT EXISTS "IDX_split_plans_product_status" ON "split_plans" ("product_type", "status");

DO $$ BEGIN
  ALTER TABLE "split_plans"
  ADD CONSTRAINT "FK_split_plans_owner"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- budget_pools table
CREATE TABLE IF NOT EXISTS "budget_pools" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" varchar(200) NOT NULL,
  "description" text,
  "project_id" varchar(100),
  "total_budget" bigint NOT NULL DEFAULT 0,
  "funded_amount" bigint NOT NULL DEFAULT 0,
  "reserved_amount" bigint NOT NULL DEFAULT 0,
  "released_amount" bigint NOT NULL DEFAULT 0,
  "currency" varchar(10) NOT NULL DEFAULT 'USDC',
  "funding_source" "funding_source_enum" NOT NULL DEFAULT 'wallet',
  "split_plan_id" uuid,
  "status" "budget_pool_status_enum" NOT NULL DEFAULT 'draft',
  "expires_at" TIMESTAMP,
  "owner_id" uuid NOT NULL,
  "metadata" jsonb,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_budget_pools" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_budget_pools_owner_status" ON "budget_pools" ("owner_id", "status");
CREATE INDEX IF NOT EXISTS "IDX_budget_pools_project" ON "budget_pools" ("project_id");

DO $$ BEGIN
  ALTER TABLE "budget_pools"
  ADD CONSTRAINT "FK_budget_pools_owner"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "budget_pools"
  ADD CONSTRAINT "FK_budget_pools_split_plan"
  FOREIGN KEY ("split_plan_id") REFERENCES "split_plans"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- milestones table
CREATE TABLE IF NOT EXISTS "milestones" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" varchar(200) NOT NULL,
  "description" text,
  "budget_pool_id" uuid NOT NULL,
  "reserved_amount" bigint NOT NULL DEFAULT 0,
  "released_amount" bigint NOT NULL DEFAULT 0,
  "status" "milestone_status_enum" NOT NULL DEFAULT 'pending',
  "participants" jsonb NOT NULL DEFAULT '[]',
  "approval_type" "approval_type_enum" NOT NULL DEFAULT 'manual',
  "quality_gate" jsonb DEFAULT '{"minScore": 0, "requiredArtifacts": [], "autoApproveDelay": 0}',
  "artifacts" jsonb DEFAULT '[]',
  "reviewer_id" uuid,
  "review_note" text,
  "quality_score" integer,
  "sort_order" integer NOT NULL DEFAULT 0,
  "due_date" TIMESTAMP,
  "started_at" TIMESTAMP,
  "submitted_at" TIMESTAMP,
  "approved_at" TIMESTAMP,
  "released_at" TIMESTAMP,
  "metadata" jsonb,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_milestones" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_milestones_pool" ON "milestones" ("budget_pool_id");
CREATE INDEX IF NOT EXISTS "IDX_milestones_status" ON "milestones" ("status");
CREATE INDEX IF NOT EXISTS "IDX_milestones_sort" ON "milestones" ("budget_pool_id", "sort_order");

DO $$ BEGIN
  ALTER TABLE "milestones"
  ADD CONSTRAINT "FK_milestones_pool"
  FOREIGN KEY ("budget_pool_id") REFERENCES "budget_pools"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "milestones"
  ADD CONSTRAINT "FK_milestones_reviewer"
  FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Done
