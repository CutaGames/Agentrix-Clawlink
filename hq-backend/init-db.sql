-- HQ Database Initialization Script
-- Creates necessary extensions and initial data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable vector extension for embeddings (if available)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'HQ Database initialized successfully at %', NOW();
END $$;
