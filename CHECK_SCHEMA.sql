-- Check which schema the tables are in
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name IN ('task_comments', 'task_attachments');

-- Check if tables are exposed to PostgREST
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename IN ('task_comments', 'task_attachments');
