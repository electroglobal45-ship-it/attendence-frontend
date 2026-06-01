-- Force delete employee dhruvelectroglobal@gmail.com
-- This will find and delete all related records first

-- Step 1: Find the user ID
DO $$
DECLARE
    target_user_id UUID;
    target_email TEXT := 'dhruvelectroglobal@gmail.com';
BEGIN
    -- Get user ID
    SELECT id INTO target_user_id FROM users WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User not found: %', target_email;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user ID: %', target_user_id;
    
    -- Delete from all related tables (adjust column names as needed)
    -- Check your actual table structure and column names
    
    -- Try different possible column names for attendance
    BEGIN
        EXECUTE 'DELETE FROM attendance WHERE employee_id = $1' USING target_user_id;
        RAISE NOTICE 'Deleted from attendance (employee_id)';
    EXCEPTION WHEN undefined_column THEN
        BEGIN
            EXECUTE 'DELETE FROM attendance WHERE user_id = $1' USING target_user_id;
            RAISE NOTICE 'Deleted from attendance (user_id)';
        EXCEPTION WHEN undefined_column THEN
            RAISE NOTICE 'Skipped attendance - column not found';
        END;
    END;
    
    -- Delete from leave_requests
    BEGIN
        EXECUTE 'DELETE FROM leave_requests WHERE user_id = $1' USING target_user_id;
        RAISE NOTICE 'Deleted from leave_requests';
    EXCEPTION WHEN undefined_column THEN
        BEGIN
            EXECUTE 'DELETE FROM leave_requests WHERE employee_id = $1' USING target_user_id;
            RAISE NOTICE 'Deleted from leave_requests (employee_id)';
        EXCEPTION WHEN undefined_column THEN
            RAISE NOTICE 'Skipped leave_requests';
        END;
    END;
    
    -- Delete from tasks
    BEGIN
        EXECUTE 'DELETE FROM tasks WHERE assigned_to = $1 OR created_by = $1' USING target_user_id;
        RAISE NOTICE 'Deleted from tasks';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped tasks';
    END;
    
    -- Delete from task_comments
    BEGIN
        EXECUTE 'DELETE FROM task_comments WHERE user_id = $1' USING target_user_id;
        RAISE NOTICE 'Deleted from task_comments';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped task_comments';
    END;
    
    -- Delete from task_attachments
    BEGIN
        EXECUTE 'DELETE FROM task_attachments WHERE uploaded_by = $1' USING target_user_id;
        RAISE NOTICE 'Deleted from task_attachments';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped task_attachments';
    END;
    
    -- Delete from task_activities
    BEGIN
        EXECUTE 'DELETE FROM task_activities WHERE user_id = $1' USING target_user_id;
        RAISE NOTICE 'Deleted from task_activities';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped task_activities';
    END;
    
    -- Delete from project_members
    BEGIN
        EXECUTE 'DELETE FROM project_members WHERE user_id = $1' USING target_user_id;
        RAISE NOTICE 'Deleted from project_members';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped project_members';
    END;
    
    -- Finally delete the user
    EXECUTE 'DELETE FROM users WHERE id = $1' USING target_user_id;
    RAISE NOTICE 'Successfully deleted user: %', target_email;
    
END $$;
