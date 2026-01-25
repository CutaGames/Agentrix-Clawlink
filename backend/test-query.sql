-- Check products and orders timestamp columns
SELECT 'products' as tbl, column_name FROM information_schema.columns 
WHERE table_name = 'products' AND column_name LIKE '%at%' OR (table_name = 'products' AND column_name LIKE '%time%')
UNION ALL
SELECT 'orders' as tbl, column_name FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name LIKE '%at%' OR (table_name = 'orders' AND column_name LIKE '%time%')
ORDER BY tbl, column_name;
