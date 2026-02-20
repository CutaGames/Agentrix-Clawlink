SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'pay_intents' AND column_name = 'status';

SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_intents_status_enum') 
ORDER BY enumsortorder;
