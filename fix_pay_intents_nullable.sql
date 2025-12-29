-- Make userId nullable in pay_intents table
ALTER TABLE "pay_intents" ALTER COLUMN "userId" DROP NOT NULL;
