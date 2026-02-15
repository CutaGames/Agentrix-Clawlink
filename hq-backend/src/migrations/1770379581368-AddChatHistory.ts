import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChatHistory1770379581368 implements MigrationInterface {
    name = 'AddChatHistory1770379581368'

        public async up(queryRunner: QueryRunner): Promise<void> {
                await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bf13d27e3aa4e752c0102bd2ae"`);
                await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_0cfe3d7fac161f01a0af637bb6"`);
                await queryRunner.query(`
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hq_chat_history_role_enum') THEN
        CREATE TYPE "public"."hq_chat_history_role_enum" AS ENUM('user', 'assistant', 'system', 'tool');
    END IF;
END$$;
                `);
                await queryRunner.query(`CREATE TABLE IF NOT EXISTS "hq_chat_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" character varying, "user_id" character varying, "agent_id" character varying NOT NULL, "role" "public"."hq_chat_history_role_enum" NOT NULL, "content" text NOT NULL, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_447bc1b69a7f64b825770865212" PRIMARY KEY ("id"))`);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_f5e88c8cbdda462df718b2b151" ON "hq_chat_history" ("session_id") `);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_8e0c431c5bb603ae23ea447551" ON "hq_chat_history" ("user_id") `);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ac8f6db9f560bc224d7eb3ae6b" ON "hq_chat_history" ("agent_id") `);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_66142e93691bd0ebf6ecd64d0d" ON "hq_chat_history" ("user_id", "created_at") `);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b3c365187a9845b88eb02bf05e" ON "hq_chat_history" ("agent_id", "created_at") `);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_2a0b3e5e3eabe77190cf4ea11f" ON "hq_chat_history" ("session_id", "created_at") `);
                await queryRunner.query(`
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_tasks_type_enum') THEN
        CREATE TYPE "public"."agent_tasks_type_enum" AS ENUM('development', 'analysis', 'marketing', 'operations', 'research', 'planning', 'review', 'communication');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_tasks_status_enum') THEN
        CREATE TYPE "public"."agent_tasks_status_enum" AS ENUM('pending', 'assigned', 'in_progress', 'completed', 'failed', 'blocked', 'delegated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_tasks_priority_enum') THEN
        CREATE TYPE "public"."agent_tasks_priority_enum" AS ENUM('1', '5', '7', '9', '10');
    END IF;
END$$;
                `);
                await queryRunner.query(`CREATE TABLE IF NOT EXISTS "agent_tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "description" text NOT NULL, "type" "public"."agent_tasks_type_enum" NOT NULL DEFAULT 'development', "status" "public"."agent_tasks_status_enum" NOT NULL DEFAULT 'pending', "priority" "public"."agent_tasks_priority_enum" NOT NULL DEFAULT '5', "assigned_to_id" uuid, "created_by_id" uuid, "parent_task_id" uuid, "depends_on" text, "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "due_date" TIMESTAMP, "estimated_cost" numeric(10,4) NOT NULL DEFAULT '0', "actual_cost" numeric(10,4), "result" text, "error_message" text, "metadata" jsonb, "context" jsonb, "requires_review" boolean NOT NULL DEFAULT false, "reviewed_by_id" uuid, "reviewed_at" TIMESTAMP, "retry_count" integer NOT NULL DEFAULT '0', "max_retries" integer NOT NULL DEFAULT '3', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0dd9472bb57b7ab7d0a5cd1f20b" PRIMARY KEY ("id"))`);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e517e038d39131830a54e27080" ON "agent_tasks" ("created_at") `);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_d21ee16c3c3bff57dd7b013d8d" ON "agent_tasks" ("parent_task_id") `);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_019b1f044720e0a67e93668c96" ON "agent_tasks" ("assigned_to_id") `);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_dd692c3cd4e72091f87cfedad5" ON "agent_tasks" ("status", "priority") `);
                await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "agent_code" character varying(50) NOT NULL`);
                await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "user_id" character varying(100)`);
                await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "working_dir" character varying(500)`);
                await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`);
                await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
                await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
                await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "last_message_at" TIMESTAMP`);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e5b544810da1f4876a82f8597b" ON "chat_sessions" ("agent_code") `);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_5d73b414f14f96e08cb1952d2b" ON "chat_sessions" ("agent_code", "user_id") `);
                await queryRunner.query(`
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_019b1f044720e0a67e93668c966') THEN
        ALTER TABLE "agent_tasks" ADD CONSTRAINT "FK_019b1f044720e0a67e93668c966" FOREIGN KEY ("assigned_to_id") REFERENCES "hq_agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_e2d13cecb727d38bfb79e1b058c') THEN
        ALTER TABLE "agent_tasks" ADD CONSTRAINT "FK_e2d13cecb727d38bfb79e1b058c" FOREIGN KEY ("created_by_id") REFERENCES "hq_agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_d21ee16c3c3bff57dd7b013d8dd') THEN
        ALTER TABLE "agent_tasks" ADD CONSTRAINT "FK_d21ee16c3c3bff57dd7b013d8dd" FOREIGN KEY ("parent_task_id") REFERENCES "agent_tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_1e51ea14c87ef2d647b36f2d236') THEN
        ALTER TABLE "agent_tasks" ADD CONSTRAINT "FK_1e51ea14c87ef2d647b36f2d236" FOREIGN KEY ("reviewed_by_id") REFERENCES "hq_agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;
                `);
        }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_tasks" DROP CONSTRAINT IF EXISTS "FK_1e51ea14c87ef2d647b36f2d236"`);
        await queryRunner.query(`ALTER TABLE "agent_tasks" DROP CONSTRAINT IF EXISTS "FK_d21ee16c3c3bff57dd7b013d8dd"`);
        await queryRunner.query(`ALTER TABLE "agent_tasks" DROP CONSTRAINT IF EXISTS "FK_e2d13cecb727d38bfb79e1b058c"`);
        await queryRunner.query(`ALTER TABLE "agent_tasks" DROP CONSTRAINT IF EXISTS "FK_019b1f044720e0a67e93668c966"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_5d73b414f14f96e08cb1952d2b"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_e5b544810da1f4876a82f8597b"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "last_message_at"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "created_at"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "is_active"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "working_dir"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "user_id"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "agent_code"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "last_message_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "working_dir" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "user_id" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "agent_code" character varying(50) NOT NULL`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_dd692c3cd4e72091f87cfedad5"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_019b1f044720e0a67e93668c96"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_d21ee16c3c3bff57dd7b013d8d"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_e517e038d39131830a54e27080"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "agent_tasks"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."agent_tasks_priority_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."agent_tasks_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."agent_tasks_type_enum"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_2a0b3e5e3eabe77190cf4ea11f"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_b3c365187a9845b88eb02bf05e"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_66142e93691bd0ebf6ecd64d0d"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ac8f6db9f560bc224d7eb3ae6b"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_8e0c431c5bb603ae23ea447551"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_f5e88c8cbdda462df718b2b151"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "hq_chat_history"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."hq_chat_history_role_enum"`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_0cfe3d7fac161f01a0af637bb6" ON "chat_sessions" ("agent_code", "user_id") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bf13d27e3aa4e752c0102bd2ae" ON "chat_sessions" ("agent_code") `);
    }

}
