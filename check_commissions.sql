SELECT COUNT(*) FROM commissions WHERE "payeeType" IS NULL;
SELECT "payeeType", COUNT(*) FROM commissions GROUP BY "payeeType";
\dt skills
