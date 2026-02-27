-- Create social_comments, social_likes, social_follows tables

CREATE TABLE IF NOT EXISTS "social_comments" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "post_id"          UUID NOT NULL,
  "author_id"        UUID NOT NULL,
  "author_name"      VARCHAR(150),
  "content"          TEXT NOT NULL,
  "parent_comment_id" UUID,
  "like_count"       INTEGER NOT NULL DEFAULT 0,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_social_comments" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IDX_social_comments_post_id"    ON "social_comments" ("post_id");
CREATE INDEX IF NOT EXISTS "IDX_social_comments_author_id"  ON "social_comments" ("author_id");

CREATE TABLE IF NOT EXISTS "social_likes" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     UUID NOT NULL,
  "target_id"   UUID NOT NULL,
  "target_type" VARCHAR(20) NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_social_likes" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_social_likes" UNIQUE ("user_id", "target_id", "target_type")
);
CREATE INDEX IF NOT EXISTS "IDX_social_likes_user_id"   ON "social_likes" ("user_id");
CREATE INDEX IF NOT EXISTS "IDX_social_likes_target_id" ON "social_likes" ("target_id");

CREATE TABLE IF NOT EXISTS "social_follows" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "follower_id" UUID NOT NULL,
  "followee_id" UUID NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_social_follows" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_social_follows" UNIQUE ("follower_id", "followee_id")
);
CREATE INDEX IF NOT EXISTS "IDX_social_follows_follower_id" ON "social_follows" ("follower_id");
CREATE INDEX IF NOT EXISTS "IDX_social_follows_followee_id" ON "social_follows" ("followee_id");

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('social_posts','social_comments','social_likes','social_follows','direct_messages')
ORDER BY table_name;
