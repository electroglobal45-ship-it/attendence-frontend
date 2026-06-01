-- SIMPLEST METHOD: Just delete the user
-- Supabase should handle cascading deletes automatically

DELETE FROM users WHERE email = 'dhruvelectroglobal@gmail.com';

-- If the above fails, run these queries one by one:

-- 1. Check if user exists
-- SELECT id, email, name FROM users WHERE email = 'dhruvelectroglobal@gmail.com';

-- 2. If you need to manually delete related records, get the user ID first:
-- SELECT id FROM users WHERE email = 'dhruvelectroglobal@gmail.com';

-- 3. Then delete from each table (replace YOUR_USER_ID with actual ID):
-- DELETE FROM attendance WHERE employee_id = 'YOUR_USER_ID';
-- DELETE FROM leave_requests WHERE user_id = 'YOUR_USER_ID';
-- DELETE FROM tasks WHERE assigned_to = 'YOUR_USER_ID' OR created_by = 'YOUR_USER_ID';
-- DELETE FROM users WHERE email = 'dhruvelectroglobal@gmail.com';
