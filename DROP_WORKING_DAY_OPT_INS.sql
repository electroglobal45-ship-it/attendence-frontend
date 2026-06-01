-- Drop existing working_day_opt_ins table and recreate with new structure
-- Run this FIRST, then run WORKING_DAY_OPT_IN_MIGRATION.sql

-- Drop existing policies
DROP POLICY IF EXISTS "Employees can view own opt-ins" ON working_day_opt_ins;
DROP POLICY IF EXISTS "Employees can create own opt-ins" ON working_day_opt_ins;
DROP POLICY IF EXISTS "Admins can update opt-ins" ON working_day_opt_ins;
DROP POLICY IF EXISTS "Employees can delete own pending opt-ins" ON working_day_opt_ins;
DROP POLICY IF EXISTS "Employees can delete own opt-ins" ON working_day_opt_ins;

-- Drop trigger
DROP TRIGGER IF EXISTS working_day_opt_ins_updated_at ON working_day_opt_ins;

-- Drop function
DROP FUNCTION IF EXISTS update_working_day_opt_ins_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_working_day_opt_ins_employee;
DROP INDEX IF EXISTS idx_working_day_opt_ins_date;
DROP INDEX IF EXISTS idx_working_day_opt_ins_status;

-- Drop table
DROP TABLE IF EXISTS working_day_opt_ins;
