-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify tables exist
SELECT 'task_comments columns:' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'task_comments' AND table_schema = 'public';

SELECT 'task_attachments columns:' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'task_attachments' AND table_schema = 'public';
