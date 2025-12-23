-- Rename columns in agent_sessions to match entity definition (snake_case)
ALTER TABLE agent_sessions RENAME COLUMN "sessionId" TO session_id;
ALTER TABLE agent_sessions RENAME COLUMN "userId" TO user_id;
ALTER TABLE agent_sessions RENAME COLUMN "agentId" TO agent_id;
ALTER TABLE agent_sessions RENAME COLUMN "signerAddress" TO signer_address;
ALTER TABLE agent_sessions RENAME COLUMN "ownerAddress" TO owner_address;
ALTER TABLE agent_sessions RENAME COLUMN "singleLimit" TO single_limit;
ALTER TABLE agent_sessions RENAME COLUMN "dailyLimit" TO daily_limit;
ALTER TABLE agent_sessions RENAME COLUMN "usedToday" TO used_today;
