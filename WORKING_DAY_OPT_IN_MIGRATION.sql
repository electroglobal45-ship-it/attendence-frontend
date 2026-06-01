-- Migration: Working Day Opt-In System
-- Allows employees to opt-in to work on Sundays and 3rd Saturdays
-- These days will count as working days for salary calculation

-- Create working_day_opt_ins table
CREATE TABLE IF NOT EXISTS working_day_opt_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sunday', 'third_saturday')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one opt-in per employee per date
  UNIQUE(employee_id, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_working_day_opt_ins_employee ON working_day_opt_ins(employee_id);
CREATE INDEX IF NOT EXISTS idx_working_day_opt_ins_date ON working_day_opt_ins(date);

-- Enable RLS
ALTER TABLE working_day_opt_ins ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can view their own opt-ins
CREATE POLICY "Employees can view own opt-ins"
  ON working_day_opt_ins
  FOR SELECT
  USING (
    employee_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Employees can create their own opt-ins
CREATE POLICY "Employees can create own opt-ins"
  ON working_day_opt_ins
  FOR INSERT
  WITH CHECK (employee_id = auth.uid());

-- Policy: Employees can delete their own opt-ins
CREATE POLICY "Employees can delete own opt-ins"
  ON working_day_opt_ins
  FOR DELETE
  USING (employee_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_working_day_opt_ins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER working_day_opt_ins_updated_at
  BEFORE UPDATE ON working_day_opt_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_working_day_opt_ins_updated_at();

-- Grant permissions
GRANT ALL ON working_day_opt_ins TO authenticated;
GRANT ALL ON working_day_opt_ins TO service_role;

COMMENT ON TABLE working_day_opt_ins IS 'Stores employee opt-ins for working on Sundays and 3rd Saturdays';
COMMENT ON COLUMN working_day_opt_ins.type IS 'Type of opt-in: sunday or third_saturday';
