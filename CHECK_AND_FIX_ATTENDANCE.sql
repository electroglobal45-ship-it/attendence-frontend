-- Check for invalid attendance records
SELECT 
    id,
    employee_id,
    date,
    check_in,
    check_out,
    status,
    created_at
FROM attendance
WHERE check_in IS NULL OR check_in::text !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
ORDER BY created_at DESC;

-- If you see records with invalid check_in, delete them:
-- DELETE FROM attendance WHERE check_in IS NULL OR check_in::text !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}';

-- Or if you want to delete all test attendance records and start fresh:
-- TRUNCATE TABLE attendance CASCADE;
