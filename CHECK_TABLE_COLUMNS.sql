-- Check what columns exist in task_comments table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'task_comments'
ORDER BY ordinal_position;

-- Check what columns exist in task_attachments table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'task_attachments'
ORDER BY ordinal_position;
