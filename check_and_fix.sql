-- Check counts
SELECT 'products' as table_name, count(*) FROM products
UNION ALL
SELECT 'skills' as table_name, count(*) FROM skills
UNION ALL
SELECT 'marketplace_assets' as table_name, count(*) FROM marketplace_assets;

-- Check sample data from skills
SELECT id, name, status, "isPublic" FROM skills LIMIT 5;

-- Check status values
SELECT DISTINCT status FROM skills;

-- Fix statuses
UPDATE skills SET status = 'published' WHERE status IS NULL OR status = 'pending' OR status = 'draft';
UPDATE skills SET "isPublic" = true;
UPDATE products SET status = 'active' WHERE status IS NULL OR status = 'pending';
