CREATE TABLE IF NOT EXISTS "commission_settlements_v4" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "order_id" character varying NOT NULL,
    "total_amount" numeric(20,6) NOT NULL,
    "merchant_amount" numeric(20,6) NOT NULL,
    "platform_fee" numeric(20,6) NOT NULL,
    "channel_fee" numeric(20,6) NOT NULL,
    "status" character varying(20) NOT NULL,
    "trigger_type" character varying(20),
    "unlock_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_commission_settlements_v4" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "commission_allocations_v4" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "settlement_id" uuid,
    "agent_wallet" character varying(42) NOT NULL,
    "role" character varying(20) NOT NULL,
    "amount" numeric(20,6) NOT NULL,
    "status" character varying(20) NOT NULL,
    CONSTRAINT "PK_commission_allocations_v4" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_commission_allocations_v4_settlement') THEN
        ALTER TABLE "commission_allocations_v4" 
        ADD CONSTRAINT "FK_commission_allocations_v4_settlement" 
        FOREIGN KEY ("settlement_id") REFERENCES "commission_settlements_v4"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

INSERT INTO migrations (timestamp, name) VALUES (1772000000001, 'MigrateCommissionSettlementsV4177200000001') ON CONFLICT DO NOTHING;
