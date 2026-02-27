-- Fix social_posts: drop and recreate with snake_case columns (TypeORM default naming)
DROP TABLE IF EXISTS "social_posts" CASCADE;

CREATE TABLE "social_posts" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "author_id"      UUID NOT NULL,
  "author_name"    VARCHAR(150),
  "author_avatar"  VARCHAR(255),
  "content"        TEXT NOT NULL,
  "type"           "social_posts_type_enum" NOT NULL DEFAULT 'text',
  "status"         "social_posts_status_enum" NOT NULL DEFAULT 'active',
  "reference_id"   VARCHAR,
  "reference_name" VARCHAR(150),
  "media"          JSONB,
  "like_count"     INTEGER NOT NULL DEFAULT 0,
  "comment_count"  INTEGER NOT NULL DEFAULT 0,
  "share_count"    INTEGER NOT NULL DEFAULT 0,
  "tags"           JSONB,
  "metadata"       JSONB,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_social_posts" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_social_posts_author_id" ON "social_posts" ("author_id");
CREATE INDEX "IDX_social_posts_created_at" ON "social_posts" ("created_at" DESC);

-- Fix direct_messages: drop and recreate with snake_case columns
DROP TABLE IF EXISTS "direct_messages" CASCADE;

CREATE TABLE "direct_messages" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "sender_id"        UUID NOT NULL,
  "sender_name"      VARCHAR(150),
  "sender_avatar"    VARCHAR(255),
  "receiver_id"      UUID NOT NULL,
  "content"          TEXT NOT NULL,
  "status"           "direct_messages_status_enum" NOT NULL DEFAULT 'sent',
  "conversation_key" VARCHAR(73) NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_direct_messages" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_direct_messages_sender_id"        ON "direct_messages" ("sender_id");
CREATE INDEX "IDX_direct_messages_receiver_id"      ON "direct_messages" ("receiver_id");
CREATE INDEX "IDX_direct_messages_conversation_key" ON "direct_messages" ("conversation_key");

-- Verify
SELECT 'social_posts columns' AS info, column_name
FROM information_schema.columns
WHERE table_name = 'social_posts'
ORDER BY ordinal_position;
