-- ═══════════════════════════════════════════════════════════════════════════════
-- SUPABASE DATABASE FUNCTIONS - ATTENDANCE SYSTEM
-- This replaces all backend business logic with PostgreSQL functions
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

-- Convert UTC timestamp to IST
CREATE OR REPLACE FUNCTION to_ist(utc_time TIMESTAMP)
RETURNS TIMESTAMP AS $$
BEGIN
  RETURN utc_time + INTERVAL '5 hours 30 minutes';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get today's date in IST (yyyy-MM-dd format)
CREATE OR REPLACE FUNCTION today_ist()
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(to_ist(NOW()), 'YYYY-MM-DD');
END;
$$ LANGUAGE plpgsql STABLE;

-- Get current month in IST (yyyy-MM format)
CREATE OR REPLACE FUNCTION current_month_ist()
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(to_ist(NOW()), 'YYYY-MM');
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if a date is a working day
CREATE OR REPLACE FUNCTION is_working_day(check_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
  day_of_week INTEGER;
  day_of_month INTEGER;
  is_holiday BOOLEAN;
BEGIN
  day_of_week := EXTRACT(DOW FROM check_date);
  day_of_month := EXTRACT(DAY FROM check_date);
  
  -- Sunday is always off
  IF day_of_week = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- 3rd Saturday is off (15th-21st)
  IF day_of_week = 6 AND day_of_month >= 15 AND day_of_month <= 21 THEN
    RETURN FALSE;
  END IF;
  
  -- Check company holidays
  SELECT EXISTS(SELECT 1 FROM company_holidays WHERE date = check_date) INTO is_holiday;
  IF is_holiday THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Count working days in a month
CREATE OR REPLACE FUNCTION count_working_days_in_month(year_val INTEGER, month_val INTEGER)
RETURNS INTEGER AS $$
DECLARE
  days_in_month INTEGER;
  working_days INTEGER := 0;
  check_date DATE;
  i INTEGER;
BEGIN
  days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(year_val, month_val, 1)) + INTERVAL '1 month - 1 day'));
  
  FOR i IN 1..days_in_month LOOP
    check_date := MAKE_DATE(year_val, month_val, i);
    IF is_working_day(check_date) THEN
      working_days := working_days + 1;
    END IF;
  END LOOP;
  
  RETURN working_days;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── ATTENDANCE FUNCTIONS ──────────────────────────────────────────────────────

-- Evaluate check-in time and determine attendance status
CREATE OR REPLACE FUNCTION evaluate_check_in(
  check_in_time TIMESTAMP,
  employee_id_param UUID,
  date_param TEXT
)
RETURNS TABLE(
  status TEXT,
  attendance_value NUMERIC,
  is_late BOOLEAN,
  increment_late_count BOOLEAN
) AS $$
DECLARE
  ist_time TIMESTAMP;
  total_minutes INTEGER;
  current_month_late_count INTEGER;
  new_late_count INTEGER;
BEGIN
  -- Convert to IST
  ist_time := to_ist(check_in_time);
  total_minutes := EXTRACT(HOUR FROM ist_time) * 60 + EXTRACT(MINUTE FROM ist_time);
  
  -- Get current month's late count
  SELECT COALESCE(SUM(CASE WHEN is_late THEN 1 ELSE 0 END), 0)
  INTO current_month_late_count
  FROM attendance
  WHERE employee_id = employee_id_param
    AND date LIKE SUBSTRING(date_param FROM 1 FOR 7) || '%'
    AND date < date_param;
  
  -- Before 9:00 AM or 9:00-9:05 AM: Present
  IF total_minutes <= 545 THEN -- 9:05 AM
    RETURN QUERY SELECT 'present'::TEXT, 1.0::NUMERIC, FALSE, FALSE;
    RETURN;
  END IF;
  
  -- After 9:30 AM: Immediate Half Day
  IF total_minutes > 570 THEN -- 9:30 AM
    RETURN QUERY SELECT 'half_day'::TEXT, 0.5::NUMERIC, FALSE, FALSE;
    RETURN;
  END IF;
  
  -- 9:05-9:30 AM: Late buffer
  new_late_count := current_month_late_count + 1;
  
  IF new_late_count <= 4 THEN
    -- Within 4 allowed lates
    RETURN QUERY SELECT 'late_within_buffer'::TEXT, 1.0::NUMERIC, TRUE, TRUE;
  ELSE
    -- 5th late or beyond: Half Day
    RETURN QUERY SELECT 'half_day'::TEXT, 0.5::NUMERIC, TRUE, TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Mark attendance (check-in)
CREATE OR REPLACE FUNCTION mark_attendance(
  employee_id_param UUID,
  check_in_time TIMESTAMP,
  selfie_url_param TEXT,
  gps_data_param JSONB
)
RETURNS JSONB AS $$
DECLARE
  date_param TEXT;
  eval_result RECORD;
  attendance_id UUID;
  late_count_val INTEGER := 0;
BEGIN
  date_param := today_ist();
  
  -- Check if already marked today
  IF EXISTS(SELECT 1 FROM attendance WHERE employee_id = employee_id_param AND date = date_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Attendance already marked for today'
    );
  END IF;
  
  -- Evaluate check-in
  SELECT * INTO eval_result FROM evaluate_check_in(check_in_time, employee_id_param, date_param);
  
  -- Set late count if applicable
  IF eval_result.increment_late_count THEN
    late_count_val := 1;
  END IF;
  
  -- Insert attendance record
  INSERT INTO attendance (
    employee_id,
    date,
    check_in,
    status,
    selfie_url,
    attendance_value,
    is_late,
    late_count,
    gps_data
  ) VALUES (
    employee_id_param,
    date_param,
    check_in_time,
    eval_result.status,
    selfie_url_param,
    eval_result.attendance_value,
    eval_result.is_late,
    late_count_val,
    gps_data_param
  )
  RETURNING id INTO attendance_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'attendance_id', attendance_id,
    'status', eval_result.status,
    'attendance_value', eval_result.attendance_value,
    'is_late', eval_result.is_late
  );
END;
$$ LANGUAGE plpgsql;

-- Mark checkout
CREATE OR REPLACE FUNCTION mark_checkout(
  employee_id_param UUID,
  checkout_time TIMESTAMP
)
RETURNS JSONB AS $$
DECLARE
  date_param TEXT;
  ist_time TIMESTAMP;
  total_minutes INTEGER;
  attendance_record RECORD;
BEGIN
  date_param := today_ist();
  ist_time := to_ist(checkout_time);
  total_minutes := EXTRACT(HOUR FROM ist_time) * 60 + EXTRACT(MINUTE FROM ist_time);
  
  -- Get today's attendance
  SELECT * INTO attendance_record
  FROM attendance
  WHERE employee_id = employee_id_param AND date = date_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No check-in found for today'
    );
  END IF;
  
  -- Check early checkout (before 6:00 PM = 1080 minutes)
  IF total_minutes < 1080 THEN
    -- Update to half day
    UPDATE attendance
    SET check_out = checkout_time,
        status = 'half_day',
        attendance_value = 0.5,
        updated_at = NOW()
    WHERE employee_id = employee_id_param AND date = date_param;
    
    RETURN jsonb_build_object(
      'success', true,
      'status', 'half_day',
      'message', 'Early checkout - marked as half day'
    );
  ELSE
    -- Normal checkout
    UPDATE attendance
    SET check_out = checkout_time,
        updated_at = NOW()
    WHERE employee_id = employee_id_param AND date = date_param;
    
    RETURN jsonb_build_object(
      'success', true,
      'status', attendance_record.status
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Get today's attendance for employee
CREATE OR REPLACE FUNCTION get_today_attendance(employee_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  attendance_record RECORD;
  date_param TEXT;
BEGIN
  date_param := today_ist();
  
  SELECT * INTO attendance_record
  FROM attendance
  WHERE employee_id = employee_id_param AND date = date_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No attendance record for today'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', row_to_json(attendance_record)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── LEAVE FUNCTIONS ───────────────────────────────────────────────────────────

-- Get monthly leave credit based on employee category
CREATE OR REPLACE FUNCTION get_monthly_leave_credit(category TEXT)
RETURNS NUMERIC AS $$
BEGIN
  CASE category
    WHEN 'regular' THEN RETURN 1.5;
    WHEN 'intern' THEN RETURN 1.0;
    WHEN 'probation' THEN RETURN 1.0;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate leave balance for employee
CREATE OR REPLACE FUNCTION calculate_leave_balance(employee_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  months_employed INTEGER;
  monthly_credit NUMERIC;
  total_earned NUMERIC;
  total_used NUMERIC;
  total_available NUMERIC;
BEGIN
  -- Get user details
  SELECT * INTO user_record FROM users WHERE id = employee_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Calculate months employed
  months_employed := EXTRACT(YEAR FROM AGE(CURRENT_DATE, user_record.joining_date)) * 12 +
                     EXTRACT(MONTH FROM AGE(CURRENT_DATE, user_record.joining_date));
  
  -- Get monthly credit
  monthly_credit := get_monthly_leave_credit(user_record.role);
  
  -- Calculate total earned (max 120 days)
  total_earned := LEAST(monthly_credit * months_employed, 120);
  
  -- Calculate total used
  SELECT COALESCE(SUM(
    CASE 
      WHEN leave_type = 'full_day' THEN 
        (end_date - start_date + 1)
      WHEN leave_type = 'half_day' THEN 0.5
      WHEN leave_type = 'short_leave' THEN 0
      ELSE 0
    END
  ), 0)
  INTO total_used
  FROM leaves
  WHERE employee_id = employee_id_param AND status = 'approved';
  
  total_available := total_earned - total_used;
  
  RETURN jsonb_build_object(
    'success', true,
    'monthly_credit', monthly_credit,
    'total_earned', total_earned,
    'total_used', total_used,
    'total_available', total_available,
    'annual_limit', 12,
    'sick_limit', 4,
    'personal_limit', 4
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Detect sandwich leave between dates
CREATE OR REPLACE FUNCTION detect_sandwich_leave(
  start_date_param DATE,
  end_date_param DATE
)
RETURNS TEXT[] AS $$
DECLARE
  sandwich_dates TEXT[] := ARRAY[]::TEXT[];
  check_date DATE;
BEGIN
  check_date := start_date_param + 1;
  
  WHILE check_date < end_date_param LOOP
    IF NOT is_working_day(check_date) THEN
      sandwich_dates := array_append(sandwich_dates, check_date::TEXT);
    END IF;
    check_date := check_date + 1;
  END LOOP;
  
  RETURN sandwich_dates;
END;
$$ LANGUAGE plpgsql STABLE;

-- Apply for leave
CREATE OR REPLACE FUNCTION apply_leave(
  employee_id_param UUID,
  leave_type_param TEXT,
  start_date_param DATE,
  end_date_param DATE,
  reason_param TEXT
)
RETURNS JSONB AS $$
DECLARE
  leave_balance JSONB;
  working_days INTEGER := 0;
  sandwich_days TEXT[];
  total_days INTEGER;
  leave_id UUID;
  check_date DATE;
BEGIN
  -- Validate dates
  IF end_date_param < start_date_param THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'End date must be after start date'
    );
  END IF;
  
  -- Get leave balance
  leave_balance := calculate_leave_balance(employee_id_param);
  
  -- Count working days
  check_date := start_date_param;
  WHILE check_date <= end_date_param LOOP
    IF is_working_day(check_date) THEN
      working_days := working_days + 1;
    END IF;
    check_date := check_date + 1;
  END LOOP;
  
  -- Check if sufficient balance
  IF working_days > (leave_balance->>'total_available')::NUMERIC THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient leave balance'
    );
  END IF;
  
  -- Detect sandwich leave
  sandwich_days := detect_sandwich_leave(start_date_param, end_date_param);
  
  -- Insert leave request
  INSERT INTO leaves (
    employee_id,
    leave_type,
    start_date,
    end_date,
    status,
    reason
  ) VALUES (
    employee_id_param,
    leave_type_param,
    start_date_param,
    end_date_param,
    'pending',
    reason_param
  )
  RETURNING id INTO leave_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'leave_id', leave_id,
    'working_days', working_days,
    'sandwich_days', sandwich_days
  );
END;
$$ LANGUAGE plpgsql;

-- Approve/Reject leave
CREATE OR REPLACE FUNCTION approve_leave(
  leave_id_param UUID,
  admin_id_param UUID,
  approve_status TEXT
)
RETURNS JSONB AS $$
BEGIN
  -- Validate status
  IF approve_status NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid status'
    );
  END IF;
  
  -- Update leave
  UPDATE leaves
  SET status = approve_status,
      approved_by = admin_id_param,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = leave_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Leave request not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'status', approve_status
  );
END;
$$ LANGUAGE plpgsql;

-- Apply for short leave
CREATE OR REPLACE FUNCTION apply_short_leave(
  employee_id_param UUID,
  short_leave_type TEXT,
  reason_param TEXT
)
RETURNS JSONB AS $$
DECLARE
  ist_time TIMESTAMP;
  total_minutes INTEGER;
  monthly_short_leaves INTEGER;
  leave_id UUID;
  current_month TEXT;
BEGIN
  ist_time := to_ist(NOW());
  total_minutes := EXTRACT(HOUR FROM ist_time) * 60 + EXTRACT(MINUTE FROM ist_time);
  current_month := current_month_ist();
  
  -- Check monthly limit (2 per month)
  SELECT COUNT(*)
  INTO monthly_short_leaves
  FROM leaves
  WHERE employee_id = employee_id_param
    AND leave_type = 'short_leave'
    AND TO_CHAR(start_date, 'YYYY-MM') = current_month
    AND status = 'approved';
  
  IF monthly_short_leaves >= 2 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Short leave limit (2/month) reached'
    );
  END IF;
  
  -- Validate timing
  IF short_leave_type = 'morning' THEN
    -- Must report by 11:05 AM (665 minutes)
    IF total_minutes > 665 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Morning short leave must be reported by 11:05 AM'
      );
    END IF;
  ELSIF short_leave_type = 'evening' THEN
    -- Cannot leave before 4:00 PM (960 minutes)
    IF total_minutes < 960 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Evening short leave cannot be taken before 4:00 PM'
      );
    END IF;
  END IF;
  
  -- Insert short leave
  INSERT INTO leaves (
    employee_id,
    leave_type,
    start_date,
    end_date,
    status,
    reason,
    monthly_count
  ) VALUES (
    employee_id_param,
    'short_leave',
    CURRENT_DATE,
    CURRENT_DATE,
    'pending',
    reason_param,
    monthly_short_leaves + 1
  )
  RETURNING id INTO leave_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'leave_id', leave_id
  );
END;
$$ LANGUAGE plpgsql;

-- ─── SALARY FUNCTIONS ──────────────────────────────────────────────────────────

-- Calculate salary for a month
CREATE OR REPLACE FUNCTION calculate_salary(
  employee_id_param UUID,
  year_param INTEGER,
  month_param INTEGER
)
RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  working_days INTEGER;
  per_day_salary NUMERIC;
  total_attendance_value NUMERIC;
  payable_salary NUMERIC;
  no_leave_bonus NUMERIC := 0;
  leaves_this_month INTEGER;
  salary_id UUID;
BEGIN
  -- Get user details
  SELECT * INTO user_record FROM users WHERE id = employee_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Count working days
  working_days := count_working_days_in_month(year_param, month_param);
  
  -- Calculate per day salary
  per_day_salary := user_record.monthly_salary / working_days;
  
  -- Get total attendance value
  SELECT COALESCE(SUM(attendance_value), 0)
  INTO total_attendance_value
  FROM attendance
  WHERE employee_id = employee_id_param
    AND date LIKE year_param || '-' || LPAD(month_param::TEXT, 2, '0') || '%';
  
  -- Calculate payable salary
  payable_salary := per_day_salary * total_attendance_value;
  
  -- Check for no-leave bonus (2 days salary if no leaves taken)
  SELECT COUNT(*)
  INTO leaves_this_month
  FROM leaves
  WHERE employee_id = employee_id_param
    AND status = 'approved'
    AND EXTRACT(YEAR FROM start_date) = year_param
    AND EXTRACT(MONTH FROM start_date) = month_param;
  
  IF leaves_this_month = 0 THEN
    no_leave_bonus := per_day_salary * 2;
  END IF;
  
  -- Insert or update salary record
  INSERT INTO salary (
    employee_id,
    year,
    month,
    working_days,
    per_day_salary,
    total_attendance_value,
    payable_salary,
    bonus_amount,
    bonus_type
  ) VALUES (
    employee_id_param,
    year_param,
    month_param,
    working_days,
    ROUND(per_day_salary, 2),
    total_attendance_value,
    ROUND(payable_salary, 2),
    ROUND(no_leave_bonus, 2),
    CASE WHEN no_leave_bonus > 0 THEN 'no_leave' ELSE NULL END
  )
  ON CONFLICT (employee_id, year, month)
  DO UPDATE SET
    working_days = EXCLUDED.working_days,
    per_day_salary = EXCLUDED.per_day_salary,
    total_attendance_value = EXCLUDED.total_attendance_value,
    payable_salary = EXCLUDED.payable_salary,
    bonus_amount = EXCLUDED.bonus_amount,
    bonus_type = EXCLUDED.bonus_type,
    updated_at = NOW()
  RETURNING id INTO salary_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'salary_id', salary_id,
    'working_days', working_days,
    'per_day_salary', ROUND(per_day_salary, 2),
    'total_attendance_value', total_attendance_value,
    'payable_salary', ROUND(payable_salary, 2),
    'bonus_amount', ROUND(no_leave_bonus, 2),
    'total_salary', ROUND(payable_salary + no_leave_bonus, 2)
  );
END;
$$ LANGUAGE plpgsql;

-- Calculate Diwali bonus (accumulated no-leave bonus)
CREATE OR REPLACE FUNCTION calculate_diwali_bonus(employee_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  total_bonus NUMERIC;
  bonus_months INTEGER;
BEGIN
  -- Sum all no-leave bonuses up to October
  SELECT COALESCE(SUM(bonus_amount), 0), COUNT(*)
  INTO total_bonus, bonus_months
  FROM salary
  WHERE employee_id = employee_id_param
    AND bonus_type = 'no_leave'
    AND month <= 10;
  
  RETURN jsonb_build_object(
    'success', true,
    'bonus_months', bonus_months,
    'total_bonus', ROUND(total_bonus, 2)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Calculate internship completion bonus
CREATE OR REPLACE FUNCTION calculate_internship_bonus(employee_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  total_bonus NUMERIC;
  bonus_months INTEGER;
BEGIN
  -- Sum all no-leave bonuses
  SELECT COALESCE(SUM(bonus_amount), 0), COUNT(*)
  INTO total_bonus, bonus_months
  FROM salary
  WHERE employee_id = employee_id_param
    AND bonus_type = 'no_leave';
  
  RETURN jsonb_build_object(
    'success', true,
    'bonus_months', bonus_months,
    'total_bonus', ROUND(total_bonus, 2)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── EXPORT FUNCTIONS ──────────────────────────────────────────────────────────

-- Get attendance report for export
CREATE OR REPLACE FUNCTION get_attendance_report(
  start_date_param DATE,
  end_date_param DATE,
  employee_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
  employee_name TEXT,
  employee_email TEXT,
  date TEXT,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  status TEXT,
  attendance_value NUMERIC,
  is_late BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.name,
    u.email,
    a.date,
    a.check_in,
    a.check_out,
    a.status,
    a.attendance_value,
    a.is_late
  FROM attendance a
  JOIN users u ON a.employee_id = u.id
  WHERE a.date >= start_date_param::TEXT
    AND a.date <= end_date_param::TEXT
    AND (employee_id_param IS NULL OR a.employee_id = employee_id_param)
  ORDER BY a.date DESC, u.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get salary report for export
CREATE OR REPLACE FUNCTION get_salary_report(
  year_param INTEGER,
  month_param INTEGER,
  employee_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
  employee_name TEXT,
  employee_email TEXT,
  monthly_salary NUMERIC,
  working_days INTEGER,
  per_day_salary NUMERIC,
  total_attendance_value NUMERIC,
  payable_salary NUMERIC,
  bonus_amount NUMERIC,
  total_salary NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.name,
    u.email,
    u.monthly_salary,
    s.working_days,
    s.per_day_salary,
    s.total_attendance_value,
    s.payable_salary,
    s.bonus_amount,
    (s.payable_salary + s.bonus_amount) as total_salary
  FROM salary s
  JOIN users u ON s.employee_id = u.id
  WHERE s.year = year_param
    AND s.month = month_param
    AND (employee_id_param IS NULL OR s.employee_id = employee_id_param)
  ORDER BY u.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get leaves report for export
CREATE OR REPLACE FUNCTION get_leaves_report(
  start_date_param DATE,
  end_date_param DATE,
  employee_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
  employee_name TEXT,
  employee_email TEXT,
  leave_type TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT,
  reason TEXT,
  approved_by_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.name,
    u.email,
    l.leave_type,
    l.start_date,
    l.end_date,
    l.status,
    l.reason,
    approver.name as approved_by_name
  FROM leaves l
  JOIN users u ON l.employee_id = u.id
  LEFT JOIN users approver ON l.approved_by = approver.id
  WHERE l.start_date >= start_date_param
    AND l.end_date <= end_date_param
    AND (employee_id_param IS NULL OR l.employee_id = employee_id_param)
  ORDER BY l.start_date DESC, u.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- GRANT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- All backend business logic is now in PostgreSQL functions
-- ═══════════════════════════════════════════════════════════════════════════════
