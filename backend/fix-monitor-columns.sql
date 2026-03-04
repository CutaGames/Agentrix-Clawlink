-- 彻底修复 market_monitors 表的字段名问题
DO $$ 
BEGIN
    -- 确保表存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'market_monitors') THEN
        CREATE TABLE "market_monitors" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "createdAt" timestamp NOT NULL DEFAULT now(),
            "updatedAt" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "PK_market_monitors" PRIMARY KEY ("id")
        );
    END IF;

    -- 补全所有可能的字段名（兼容 camelCase 和 snake_case）
    
    -- strategyGraphId
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_monitors' AND column_name='strategyGraphId') THEN
        ALTER TABLE "market_monitors" ADD COLUMN "strategyGraphId" uuid;
    END IF;
    
    -- tokenPair
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_monitors' AND column_name='tokenPair') THEN
        ALTER TABLE "market_monitors" ADD COLUMN "tokenPair" varchar(100);
    END IF;
    
    -- chain
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_monitors' AND column_name='chain') THEN
        ALTER TABLE "market_monitors" ADD COLUMN "chain" varchar(50);
    END IF;
    
    -- monitorType
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_monitors' AND column_name='monitorType') THEN
        ALTER TABLE "market_monitors" ADD COLUMN "monitorType" varchar(50);
    END IF;
    
    -- threshold
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_monitors' AND column_name='threshold') THEN
        ALTER TABLE "market_monitors" ADD COLUMN "threshold" jsonb;
    END IF;
    
    -- lastPrice
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_monitors' AND column_name='lastPrice') THEN
        ALTER TABLE "market_monitors" ADD COLUMN "lastPrice" decimal(18,6);
    END IF;
    
    -- lastCheckedAt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_monitors' AND column_name='lastCheckedAt') THEN
        ALTER TABLE "market_monitors" ADD COLUMN "lastCheckedAt" timestamp;
    END IF;
    
    -- isActive
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_monitors' AND column_name='isActive') THEN
        ALTER TABLE "market_monitors" ADD COLUMN "isActive" boolean DEFAULT true;
    END IF;

END $$;
