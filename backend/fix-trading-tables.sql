-- 补全 Trading 模块缺失的表
DO $$ 
BEGIN
    -- 1. strategy_graphs
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'strategy_graphs') THEN
        CREATE TABLE "strategy_graphs" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "agentId" varchar(255),
            "intentText" text NOT NULL,
            "strategyType" varchar(50) NOT NULL,
            "status" varchar(20) NOT NULL DEFAULT 'active',
            "config" jsonb NOT NULL,
            "createdAt" timestamp NOT NULL DEFAULT now(),
            "updatedAt" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_strategy_graphs" PRIMARY KEY ("id")
        );
        CREATE INDEX "IDX_strategy_graphs_userId" ON "strategy_graphs" ("userId");
        CREATE INDEX "IDX_strategy_graphs_status" ON "strategy_graphs" ("status");
    END IF;

    -- 2. strategy_nodes
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'strategy_nodes') THEN
        CREATE TABLE "strategy_nodes" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "strategyGraphId" uuid NOT NULL,
            "nodeType" varchar(50) NOT NULL,
            "nodeConfig" jsonb NOT NULL,
            "executionOrder" int4 NOT NULL,
            "status" varchar(20) NOT NULL DEFAULT 'pending',
            "createdAt" timestamp NOT NULL DEFAULT now(),
            "updatedAt" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_strategy_nodes" PRIMARY KEY ("id"),
            CONSTRAINT "FK_strategy_nodes_graph" FOREIGN KEY ("strategyGraphId") REFERENCES "strategy_graphs"("id") ON DELETE CASCADE
        );
        CREATE INDEX "IDX_strategy_nodes_graphId" ON "strategy_nodes" ("strategyGraphId");
    END IF;

    -- 3. market_monitors
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'market_monitors') THEN
        CREATE TABLE "market_monitors" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "strategyGraphId" uuid,
            "tokenPair" varchar(100) NOT NULL,
            "chain" varchar(50) NOT NULL,
            "monitorType" varchar(50) NOT NULL,
            "threshold" jsonb NOT NULL,
            "lastPrice" decimal(18,6),
            "lastCheckedAt" timestamp,
            "isActive" boolean NOT NULL DEFAULT true,
            "createdAt" timestamp NOT NULL DEFAULT now(),
            "updatedAt" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_market_monitors" PRIMARY KEY ("id")
        );
        CREATE INDEX "IDX_market_monitors_pair_chain" ON "market_monitors" ("tokenPair", "chain");
    ELSE
        -- 如果表存在，检查 strategyGraphId 字段
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_monitors' AND column_name='strategyGraphId') THEN
            ALTER TABLE "market_monitors" ADD COLUMN "strategyGraphId" uuid;
        END IF;
    END IF;
END $$;
