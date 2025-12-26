-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_connections_wallettype_enum') THEN
        CREATE TYPE "wallet_connections_wallettype_enum" AS ENUM('metamask', 'walletconnect', 'phantom', 'okx');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_connections_chain_enum') THEN
        CREATE TYPE "wallet_connections_chain_enum" AS ENUM('evm', 'solana');
    END IF;
END $$;

-- Create wallet_connections table
CREATE TABLE IF NOT EXISTS "wallet_connections" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "walletType" "wallet_connections_wallettype_enum" NOT NULL,
    "walletAddress" character varying NOT NULL,
    "chain" "wallet_connections_chain_enum" NOT NULL,
    "chainId" character varying,
    "isDefault" boolean NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "lastUsedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_wallet_connections" PRIMARY KEY ("id"),
    CONSTRAINT "FK_wallet_connections_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create index
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wallet_connections_address" ON "wallet_connections" (LOWER("walletAddress"));
