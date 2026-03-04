-- 检查 skills 表
SELECT COUNT(*) as total_skills FROM skills;
SELECT status, COUNT(*) as cnt FROM skills GROUP BY status;
SELECT layer, COUNT(*) as cnt FROM skills GROUP BY layer;
SELECT source, COUNT(*) as cnt FROM skills GROUP BY source;
SELECT * FROM skills LIMIT 5;
