-- Add missing columns to merchant_tasks
ALTER TABLE "merchant_tasks" ADD COLUMN IF NOT EXISTS "visibility" character varying NOT NULL DEFAULT 'private';
ALTER TABLE "merchant_tasks" ADD COLUMN IF NOT EXISTS "tags" text;

-- Add missing enum type for skill_analytics if needed (caller_type already exists)
-- Add any missing indexes
CREATE INDEX IF NOT EXISTS "idx_merchant_tasks_visibility_status" ON "merchant_tasks" ("visibility", "status");
CREATE INDEX IF NOT EXISTS "idx_merchant_tasks_type_status" ON "merchant_tasks" ("type", "status");
CREATE INDEX IF NOT EXISTS "idx_merchant_tasks_created_at" ON "merchant_tasks" ("created_at");

-- Also check task_bids table exists
CREATE TABLE IF NOT EXISTS "task_bids" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "task_id" uuid NOT NULL,
    "bidder_id" uuid NOT NULL,
    "proposed_budget" numeric(15,2) NOT NULL,
    "currency" character varying(10) NOT NULL DEFAULT 'USD',
    "estimated_days" integer NOT NULL,
    "proposal" text NOT NULL,
    "portfolio" jsonb,
    "status" character varying NOT NULL DEFAULT 'pending',
    "metadata" jsonb,
    "responded_at" timestamp without time zone,
    "created_at" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_task_bids" PRIMARY KEY ("id"),
    CONSTRAINT "FK_task_bids_task" FOREIGN KEY ("task_id") REFERENCES "merchant_tasks"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_task_bids_bidder" FOREIGN KEY ("bidder_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_task_bids_task_id" ON "task_bids" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_bids_bidder_id" ON "task_bids" ("bidder_id");
