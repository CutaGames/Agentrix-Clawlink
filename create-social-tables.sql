-- Create social_posts table
DO $$ BEGIN
  CREATE TYPE "social_posts_type_enum" AS ENUM('text','agent_result','skill_share','install_success','showcase');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "social_posts_status_enum" AS ENUM('active','hidden','removed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "social_posts" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "authorId"      UUID NOT NULL,
  "authorName"    VARCHAR(150),
  "authorAvatar"  VARCHAR(255),
  "content"       TEXT NOT NULL,
  "type"          "social_posts_type_enum" NOT NULL DEFAULT 'text',
  "status"        "social_posts_status_enum" NOT NULL DEFAULT 'active',
  "referenceId"   VARCHAR,
  "referenceName" VARCHAR(150),
  "media"         JSONB,
  "likeCount"     INTEGER NOT NULL DEFAULT 0,
  "commentCount"  INTEGER NOT NULL DEFAULT 0,
  "shareCount"    INTEGER NOT NULL DEFAULT 0,
  "tags"          JSONB,
  "metadata"      JSONB,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_social_posts" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_social_posts_authorId" ON "social_posts" ("authorId");
CREATE INDEX IF NOT EXISTS "IDX_social_posts_createdAt" ON "social_posts" ("createdAt" DESC);

-- Create direct_messages table
DO $$ BEGIN
  CREATE TYPE "direct_messages_status_enum" AS ENUM('sent','delivered','read');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "direct_messages" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "senderId"        UUID NOT NULL,
  "senderName"      VARCHAR(150),
  "senderAvatar"    VARCHAR(255),
  "receiverId"      UUID NOT NULL,
  "content"         TEXT NOT NULL,
  "status"          "direct_messages_status_enum" NOT NULL DEFAULT 'sent',
  "conversationKey" VARCHAR(73) NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_direct_messages" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_direct_messages_senderId" ON "direct_messages" ("senderId");
CREATE INDEX IF NOT EXISTS "IDX_direct_messages_receiverId" ON "direct_messages" ("receiverId");
CREATE INDEX IF NOT EXISTS "IDX_direct_messages_conversationKey" ON "direct_messages" ("conversationKey");

SELECT 'social_posts' AS tbl, COUNT(*) FROM social_posts
UNION ALL
SELECT 'direct_messages', COUNT(*) FROM direct_messages;
