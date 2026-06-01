# Changes Summary

## 1. Delete Employee Query

**File:** `DELETE_DHRUV_EMPLOYEE.sql`

```sql
DELETE FROM users WHERE email = 'dhruvelectroglobal@gmail.com';
```

Run this query in your Supabase SQL Editor to delete the employee.

## 2. Check-in Time Updated: 9 AM → 8 AM

### Files Modified:

#### `src/constants/policy.ts`
- ✅ `OFFICE_START_HOUR` changed from 9 to 8
- ✅ `LATE_BUFFER_END_HOUR` changed from 9 to 8
- ✅ `HALF_DAY_CHECKIN_HOUR` changed from 9 to 8
- ✅ `MORNING_SHORT_LEAVE_DEADLINE_HOUR` changed from 11 to 10

#### `src/engines/attendance.engine.ts`
- ✅ Office start time: 9:00 AM → 8:00 AM (540 → 480 minutes)
- ✅ On-time window: 9:00-9:05 → 8:00-8:05
- ✅ Late buffer: 9:05-9:30 → 8:05-8:30
- ✅ Half day threshold: After 9:30 → After 8:30
- ✅ Updated all comments to reflect 8 AM times

#### `src/app/api/attendance/mark/route.ts`
- ✅ Early check-in validation: "Before 9:00 AM" → "Before 8:00 AM"
- ✅ Minimum time check: 540 minutes → 480 minutes

### New Attendance Rules:

| Time Range | Status | Attendance Value | Late Count |
|------------|--------|------------------|------------|
| 8:00 - 8:05 AM | Present | 1.0 | No |
| 8:05 - 8:30 AM | Late (within buffer) | 1.0 | Yes (max 4/month) |
| After 8:30 AM | Half Day | 0.5 | No |
| 5th late in month | Half Day | 0.5 | Yes |

### Short Leave Times Updated:
- **Morning Short Leave Deadline:** 11:05 AM → 10:05 AM (8:00 + 2h + 5min grace)
- **Evening Short Leave:** Still 4:30 PM (unchanged)

## Testing Checklist

- [ ] Run the delete query in Supabase
- [ ] Verify employee is deleted
- [ ] Test check-in before 8:00 AM (should show error)
- [ ] Test check-in at 8:00-8:05 AM (should be Present)
- [ ] Test check-in at 8:05-8:30 AM (should be Late)
- [ ] Test check-in after 8:30 AM (should be Half Day)
- [ ] Verify morning short leave deadline is now 10:05 AM

## Notes

All attendance calculations, validations, and business logic have been updated to reflect the new 8 AM start time. The system will now:
- Allow check-ins starting at 8:00 AM
- Mark employees as on-time until 8:05 AM
- Apply late buffer from 8:05-8:30 AM
- Mark as half-day after 8:30 AM
