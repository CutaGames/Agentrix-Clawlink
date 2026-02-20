#!/bin/bash
# Convert pay_intents enum columns to varchar on LOCAL DB
PGPASSWORD='agentrix_secure_2024' psql -h 127.0.0.1 -U agentrix -d paymind <<'EOF'
DO $$
BEGIN
  -- Convert status column from enum to varchar if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pay_intents'
      AND column_name = 'status'
      AND udt_name = 'pay_intents_status_enum'
  ) THEN
    ALTER TABLE pay_intents ALTER COLUMN status TYPE varchar(50) USING status::text;
    RAISE NOTICE 'Converted pay_intents.status from enum to varchar';
  ELSE
    RAISE NOTICE 'pay_intents.status is already varchar, no change needed';
  END IF;

  -- Convert type column from enum to varchar if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pay_intents'
      AND column_name = 'type'
      AND udt_name = 'pay_intents_type_enum'
  ) THEN
    ALTER TABLE pay_intents ALTER COLUMN type TYPE varchar(50) USING type::text;
    RAISE NOTICE 'Converted pay_intents.type from enum to varchar';
  ELSE
    RAISE NOTICE 'pay_intents.type is already varchar, no change needed';
  END IF;
END $$;

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'pay_intents' AND column_name IN ('status', 'type')
ORDER BY column_name;
EOF
echo "Done"
