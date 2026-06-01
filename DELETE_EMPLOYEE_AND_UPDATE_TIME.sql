-- ============================================================================
-- DELETE EMPLOYEE AND UPDATE ATTENDANCE TIME
-- ============================================================================
-- This script will:
-- 1. Delete employee dhruvelectroglobal@gmail.com and all related data
-- 2. Change attendance marking time from 9 AM to 8 AM
-- ============================================================================

-- STEP 1: Delete employee dhruvelectroglobal@gmail.com
-- ============================================================================

-- First, let's find the user ID
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO user_uuid 
    FROM users 
    WHERE email = 'dhruvelectroglobal@gmail.com';
    
    IF user_uuid IS NOT NULL THEN
        RAISE NOTICE 'Found user with ID: %', user_uuid;
        
        -- Delete from attendance records
        DELETE FROM attendance WHERE user_id = user_uuid;
        RAISE NOTICE 'Deleted attendance records';
        
        -- Delete from leave requests
        DELETE FROM leave_requests WHERE user_id = user_uuid;
        RAISE NOTICE 'Deleted leave requests';
        
        -- Delete from tasks (assigned to)
        DELETE FROM tasks WHERE assigned_to = user_uuid;
        RAISE NOTICE 'Deleted assigned tasks';
        
        -- Delete from tasks (created by)
        DELETE FROM tasks WHERE created_by = user_uuid;
        RAISE NOTICE 'Deleted created tasks';
        
        -- Delete from task comments
        DELETE FROM task_comments WHERE user_id = user_uuid;
        RAISE NOTICE 'Deleted task comments';
        
        -- Delete from task attachments
        DELETE FROM task_attachments WHERE uploaded_by = user_uuid;
        RAISE NOTICE 'Deleted task attachments';
        
        -- Delete from task activities
        DELETE FROM task_activities WHERE user_id = user_uuid;
        RAISE NOTICE 'Deleted task activities';
        
        -- Delete from project members
        DELETE FROM project_members WHERE user_id = user_uuid;
        RAISE NOTICE 'Deleted project memberships';
        
        -- Delete from working_day_opt_ins (if exists)
        DELETE FROM working_day_opt_ins WHERE user_id = user_uuid;
        RAISE NOTICE 'Deleted working day opt-ins';
        
        -- Finally, delete the user
        DELETE FROM users WHERE id = user_uuid;
        RAISE NOTICE 'Deleted user account';
        
        RAISE NOTICE 'Successfully deleted employee: dhruvelectroglobal@gmail.com';
    ELSE
        RAISE NOTICE 'User not found: dhruvelectroglobal@gmail.com';
    END IF;
END $$;


-- STEP 2: Update attendance marking time from 9 AM to 8 AM
-- ============================================================================

-- If you have a settings table
-- UPDATE settings SET attendance_start_time = '08:00:00' WHERE attendance_start_time = '09:00:00';

-- If you have hardcoded times in your application, you'll need to update the code
-- Check these files:
-- - src/app/api/attendance/mark/route.ts
-- - src/app/api/attendance/route.ts
-- - Any other attendance-related API routes

-- For now, let's create a note about what needs to be changed in code:
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'ATTENDANCE TIME UPDATE REQUIRED IN CODE';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Please update the following in your codebase:';
    RAISE NOTICE '1. Search for "09:00" or "9:00" in attendance API routes';
    RAISE NOTICE '2. Change to "08:00" or "8:00"';
    RAISE NOTICE '3. Update any frontend components that display attendance times';
    RAISE NOTICE '4. Update any validation logic that checks attendance times';
    RAISE NOTICE '============================================================================';
END $$;


-- VERIFICATION QUERIES
-- ============================================================================

-- Verify user is deleted
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS: User deleted'
        ELSE 'WARNING: User still exists'
    END as status
FROM users 
WHERE email = 'dhruvelectroglobal@gmail.com';

-- Check for any remaining references
SELECT 
    'attendance' as table_name,
    COUNT(*) as remaining_records
FROM attendance 
WHERE user_id IN (SELECT id FROM users WHERE email = 'dhruvelectroglobal@gmail.com')

UNION ALL

SELECT 
    'leave_requests' as table_name,
    COUNT(*) as remaining_records
FROM leave_requests 
WHERE user_id IN (SELECT id FROM users WHERE email = 'dhruvelectroglobal@gmail.com')

UNION ALL

SELECT 
    'tasks' as table_name,
    COUNT(*) as remaining_records
FROM tasks 
WHERE assigned_to IN (SELECT id FROM users WHERE email = 'dhruvelectroglobal@gmail.com')
   OR created_by IN (SELECT id FROM users WHERE email = 'dhruvelectroglobal@gmail.com');


-- ============================================================================
-- ROLLBACK (if needed - run BEFORE the delete script)
-- ============================================================================
-- If you want to backup the user data before deleting, run this first:

/*
-- Create backup tables
CREATE TABLE IF NOT EXISTS backup_users AS 
SELECT * FROM users WHERE email = 'dhruvelectroglobal@gmail.com';

CREATE TABLE IF NOT EXISTS backup_attendance AS 
SELECT a.* FROM attendance a
JOIN users u ON a.user_id = u.id
WHERE u.email = 'dhruvelectroglobal@gmail.com';

CREATE TABLE IF NOT EXISTS backup_leave_requests AS 
SELECT lr.* FROM leave_requests lr
JOIN users u ON lr.user_id = u.id
WHERE u.email = 'dhruvelectroglobal@gmail.com';

-- Verify backups
SELECT 'backup_users' as table_name, COUNT(*) as records FROM backup_users
UNION ALL
SELECT 'backup_attendance' as table_name, COUNT(*) as records FROM backup_attendance
UNION ALL
SELECT 'backup_leave_requests' as table_name, COUNT(*) as records FROM backup_leave_requests;
*/
