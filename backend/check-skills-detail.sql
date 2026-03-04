-- 检查 skills 表按 layer, status, human_accessible 分布
SELECT layer, status, human_accessible, COUNT(*) as cnt 
FROM skills 
GROUP BY layer, status, human_accessible 
ORDER BY layer, status;

-- 单独检查 resource 层的数据
SELECT COUNT(*) as resource_published_human_accessible
FROM skills
WHERE layer = 'resource' 
  AND status = 'published' 
  AND human_accessible = true;

-- 检查 skills 表的列名
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'skills';
