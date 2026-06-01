-- ============================================================================
-- FINAL FIX - Rename columns to match API expectations
-- ============================================================================

-- Fix task_comments: rename 'content' to 'comment' if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'task_comments' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE public.task_comments RENAME COLUMN content TO comment;
        RAISE NOTICE '✓ Renamed task_comments.content to comment';
    ELSE
        RAISE NOTICE '✓ task_comments.comment already exists';
    END IF;
END $$;

-- Fix task_attachments: rename 'url' to 'file_url' if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'task_attachments' 
        AND column_name = 'url'
    ) THEN
        ALTER TABLE public.task_attachments RENAME COLUMN url TO file_url;
        RAISE NOTICE '✓ Renamed task_attachments.url to file_url';
    ELSE
        RAISE NOTICE '✓ task_attachments.file_url already exists';
    END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the changes
SELECT 'task_comments columns:' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'task_comments' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'task_attachments columns:' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'task_attachments' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✓ Migration complete! Columns renamed to match API.' as status;
