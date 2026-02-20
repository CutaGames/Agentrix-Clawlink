-- Fix pay_intents_status_enum missing values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'succeeded' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_intents_status_enum')) THEN
    ALTER TYPE pay_intents_status_enum ADD VALUE 'succeeded';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'requires_payment_method' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_intents_status_enum')) THEN
    ALTER TYPE pay_intents_status_enum ADD VALUE 'requires_payment_method';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'processing' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_intents_status_enum')) THEN
    ALTER TYPE pay_intents_status_enum ADD VALUE 'processing';
  END IF;
END $$;

-- Verify
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_intents_status_enum')
ORDER BY enumsortorder;
