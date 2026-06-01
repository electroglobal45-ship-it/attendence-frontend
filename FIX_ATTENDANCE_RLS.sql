-- Fix RLS policies for attendance table to allow new employees to mark attendance

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can manage all attendance" ON attendance;

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policy 1: Employees can insert their own attendance
CREATE POLICY "Employees can insert own attendance"
ON attendance
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = auth.uid()
);

-- Policy 2: Employees can view their own attendance
CREATE POLICY "Employees can view own attendance"
ON attendance
FOR SELECT
TO authenticated
USING (
  employee_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy 3: Admins can do everything
CREATE POLICY "Admins can manage all attendance"
ON attendance
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'attendance';
