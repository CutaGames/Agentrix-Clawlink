-- Check a sample skill from database
SELECT id, name, author_id, status, layer 
FROM skills 
WHERE status = 'published' 
LIMIT 3;
