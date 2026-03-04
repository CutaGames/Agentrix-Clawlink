-- Agentrix 数据库全量补全脚本
-- 目标：补全所有缺失的 P0/P1 核心表和字段

-- 1. 基础扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 修复 users 表缺失字段
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='metadata') THEN
        ALTER TABLE "users" ADD COLUMN "metadata" jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='googleId') THEN
        ALTER TABLE "users" ADD COLUMN "googleId" varchar(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='paymindId') THEN
        ALTER TABLE "users" ADD COLUMN "paymindId" varchar(255);
    END IF;
END $$;

-- 3. 创建 API Keys 表 (用于 GPTs/API 接入)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        CREATE TYPE "public"."api_keys_status_enum" AS ENUM('active', 'revoked', 'expired');
        CREATE TABLE "api_keys" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "key_hash" varchar(64) NOT NULL,
            "key_prefix" varchar(20) NOT NULL,
            "name" varchar(100) NOT NULL,
            "user_id" uuid NOT NULL,
            "status" "public"."api_keys_status_enum" NOT NULL DEFAULT 'active',
            "expires_at" timestamp,
            "last_used_at" timestamp,
            "usage_count" int4 NOT NULL DEFAULT 0,
            "allowed_origins" text,
            "scopes" text NOT NULL DEFAULT 'read,search,order,payment',
            "created_at" timestamp NOT NULL DEFAULT now(),
            "updated_at" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_api_keys" PRIMARY KEY ("id"),
            CONSTRAINT "FK_api_keys_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        );
        CREATE INDEX "IDX_api_keys_key_hash" ON "api_keys" ("key_hash");
        CREATE INDEX "IDX_api_keys_user_id" ON "api_keys" ("user_id");
    END IF;
END $$;

-- 4. 创建 Agent 钱包与权限相关表
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_wallets') THEN
        CREATE TABLE "agent_wallets" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "agent_id" varchar(255) NOT NULL,
            "user_id" uuid NOT NULL,
            "address" varchar(255) NOT NULL,
            "chain" varchar(50) NOT NULL,
            "encrypted_key" text,
            "metadata" jsonb,
            "created_at" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_agent_wallets" PRIMARY KEY ("id"),
            CONSTRAINT "FK_agent_wallets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_permissions') THEN
        CREATE TABLE "agent_permissions" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "agent_id" varchar(255) NOT NULL,
            "user_id" uuid NOT NULL,
            "permission" varchar(100) NOT NULL,
            "is_granted" boolean NOT NULL DEFAULT true,
            "metadata" jsonb,
            "created_at" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_agent_permissions" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- 5. 创建商户信用与合规表
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchant_trust_scores') THEN
        CREATE TABLE "merchant_trust_scores" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "merchant_id" uuid NOT NULL,
            "score" decimal(5,2) NOT NULL DEFAULT 0,
            "factors" jsonb,
            "last_updated" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_merchant_trust_scores" PRIMARY KEY ("id"),
            CONSTRAINT "FK_merchant_trust_scores_user" FOREIGN KEY ("merchant_id") REFERENCES "users"("id") ON DELETE CASCADE
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kyc_reuse_records') THEN
        CREATE TABLE "kyc_reuse_records" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "user_id" uuid NOT NULL,
            "source_platform" varchar(100) NOT NULL,
            "external_user_id" varchar(255) NOT NULL,
            "verification_data" jsonb,
            "created_at" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_kyc_reuse_records" PRIMARY KEY ("id"),
            CONSTRAINT "FK_kyc_reuse_records_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        );
    END IF;
END $$;

-- 6. 创建日志与统计表
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auto_earn_logs') THEN
        CREATE TABLE "auto_earn_logs" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "task_id" uuid NOT NULL,
            "user_id" uuid NOT NULL,
            "amount" decimal(18,6) NOT NULL,
            "currency" varchar(10) NOT NULL,
            "status" varchar(20) NOT NULL,
            "metadata" jsonb,
            "created_at" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_auto_earn_logs" PRIMARY KEY ("id")
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_usage_logs') THEN
        CREATE TABLE "agent_usage_logs" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "agent_id" varchar(255) NOT NULL,
            "user_id" uuid NOT NULL,
            "action" varchar(100) NOT NULL,
            "tokens_used" int4 DEFAULT 0,
            "cost" decimal(18,6) DEFAULT 0,
            "metadata" jsonb,
            "created_at" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_agent_usage_logs" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- 7. 修复 agent_templates 和 user_agents (如果缺失)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_templates') THEN
        CREATE TYPE "public"."agent_templates_visibility_enum" AS ENUM('private', 'public');
        CREATE TABLE "agent_templates" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" varchar(150) NOT NULL,
            "description" text,
            "category" varchar(50) NOT NULL,
            "persona" varchar(50),
            "tags" text[] DEFAULT '{}',
            "config" jsonb,
            "prompts" jsonb,
            "visibility" "public"."agent_templates_visibility_enum" NOT NULL DEFAULT 'private',
            "createdBy" uuid,
            "isFeatured" boolean DEFAULT false,
            "usageCount" int4 DEFAULT 0,
            "coverImage" varchar(150),
            "metadata" jsonb,
            "created_at" timestamp NOT NULL DEFAULT now(),
            "updated_at" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_agent_templates" PRIMARY KEY ("id")
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_agents') THEN
        CREATE TYPE "public"."user_agents_status_enum" AS ENUM('draft', 'active', 'paused');
        CREATE TABLE "user_agents" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "templateId" uuid,
            "name" varchar(150) NOT NULL,
            "description" text,
            "status" "public"."user_agents_status_enum" NOT NULL DEFAULT 'draft',
            "isPublished" boolean DEFAULT false,
            "slug" varchar(150),
            "settings" jsonb,
            "metadata" jsonb,
            "created_at" timestamp NOT NULL DEFAULT now(),
            "updated_at" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_user_agents" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- 8. 修复 social_accounts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_accounts') THEN
        CREATE TYPE "public"."social_accounts_type_enum" AS ENUM('google', 'apple', 'x', 'telegram', 'discord');
        CREATE TABLE "social_accounts" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "type" "public"."social_accounts_type_enum" NOT NULL,
            "socialId" varchar(255) NOT NULL,
            "email" varchar(255),
            "username" varchar(255),
            "displayName" varchar(255),
            "avatarUrl" varchar(500),
            "metadata" jsonb,
            "connectedAt" timestamp NOT NULL DEFAULT now(),
            "lastUsedAt" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_social_accounts" PRIMARY KEY ("id"),
            CONSTRAINT "FK_social_accounts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX "IDX_social_accounts_user_type" ON "social_accounts" ("userId", "type");
        CREATE UNIQUE INDEX "IDX_social_accounts_social_type" ON "social_accounts" ("socialId", "type");
    END IF;
END $$;
