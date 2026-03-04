CREATE TABLE IF NOT EXISTS skill_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  rating DECIMAL(2,1) NOT NULL,
  title TEXT,
  comment TEXT,
  reviewer_type VARCHAR(20) DEFAULT 'user',
  usage_count INTEGER DEFAULT 0,
  verified_usage BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_reviews_skill_created ON skill_reviews(skill_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_reviews_reviewer_skill ON skill_reviews(reviewer_id, skill_id);
