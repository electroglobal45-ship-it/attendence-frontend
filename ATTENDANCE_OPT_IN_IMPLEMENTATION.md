# Attendance Opt-In Working Day Implementation

## Overview
Implemented a system that allows employees to opt-in to work on Sundays and 3rd Saturdays. These days will count as working days for salary calculation.

## What's Been Implemented

### 1. Database Migration ✅
**File**: `WORKING_DAY_OPT_IN_MIGRATION.sql`

Creates:
- `working_day_opt_ins` table with columns:
  - `id`, `employee_id`, `date`, `type` (sunday/third_saturday)
  - `status` (pending/approved/rejected)
  - `approved_by`, `approved_at`, `reason`
- RLS policies for employee and admin access
- Indexes for performance
- Triggers for auto-updating timestamps

**Action Required**: Run this SQL in your Supabase SQL Editor

### 2. API Routes ✅

#### Employee Routes:
- **POST** `/api/attendance/opt-in-working-day` - Request to work on holiday
- **GET** `/api/attendance/opt-in-working-day` - Get own opt-in requests
- **DELETE** `/api/attendance/opt-in-working-day?id=xxx` - Cancel pending request

#### Admin Routes:
- **PUT** `/api/attendance/opt-in-working-day/[id]` - Approve/reject request
- **GET** `/api/admin/opt-in-working-days` - View all requests

### 3. Attendance Marking Logic ✅
**File**: `src/app/api/attendance/mark/route.ts`

Updated to:
- Check for approved opt-ins before blocking attendance on holidays
- Allow attendance marking if employee has approved opt-in for that date
- Show helpful error message suggesting opt-in if attendance is blocked

### 4. Admin Dashboard ✅
**File**: `src/app/(admin)/dashboard/page.tsx`

Added:
- New "Working Day Requests" tab
- Shows all opt-in requests with employee details
- Approve/Reject buttons for pending requests
- Badge showing pending count

## What Still Needs to Be Done

### 1. Employee Attendance Page UI
**File**: `src/app/(employee)/attendance/page.tsx`

Need to add:
- Button to request working on Sunday/3rd Saturday
- Modal to select date and enter reason
- Display of approved working days
- Badge showing "Working on Saturday/Sunday" when applicable

### 2. Calendar Integration
Need to update calendar views to:
- Show opted-in working days with special indicator
- Display "Working on Saturday/Sunday" label for employees

### 3. Employee Dashboard
Need to show:
- Upcoming opted-in working days
- Status of pending requests

### 4. Short Leave 2nd Half Fix
Need to allow 2nd half short leave (after 4pm) to be applied in the morning.

## Testing Steps

1. **Run Migration**:
   ```sql
   -- Copy and paste WORKING_DAY_OPT_IN_MIGRATION.sql into Supabase SQL Editor
   ```

2. **Test Employee Opt-In** (After UI is added):
   - Login as employee
   - Navigate to attendance page
   - Click "Request Working Day"
   - Select a Sunday or 3rd Saturday
   - Enter reason
   - Submit request

3. **Test Admin Approval**:
   - Login as admin
   - Go to Dashboard
   - Click "Working Day Requests" tab
   - See pending request
   - Click Approve or Reject

4. **Test Attendance Marking**:
   - As employee with approved opt-in
   - Try to mark attendance on the approved Sunday/Saturday
   - Should work normally
   - Without opt-in, should show error with suggestion

## Database Schema

```sql
working_day_opt_ins
├── id (UUID, PK)
├── employee_id (UUID, FK → users.id)
├── date (DATE)
├── type (VARCHAR: 'sunday' | 'third_saturday')
├── status (VARCHAR: 'pending' | 'approved' | 'rejected')
├── approved_by (UUID, FK → users.id)
├── approved_at (TIMESTAMP)
├── reason (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## API Examples

### Employee Requests Working Day
```bash
POST /api/attendance/opt-in-working-day
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2026-06-07",
  "type": "sunday",
  "reason": "Need to complete urgent project"
}
```

### Admin Approves Request
```bash
PUT /api/attendance/opt-in-working-day/[id]
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved"
}
```

### Get Employee's Opt-Ins
```bash
GET /api/attendance/opt-in-working-day?month=2026-06
Authorization: Bearer <token>
```

## Next Steps

1. ✅ Run the database migration
2. ⏳ Add UI to employee attendance page for requesting opt-ins
3. ⏳ Update calendar views to show opted-in days
4. ⏳ Add employee dashboard widget for opt-in status
5. ⏳ Fix 2nd half short leave timing

## Notes

- Opt-ins must be for actual Sundays or 3rd Saturdays (validated)
- Only one opt-in per employee per date
- Employees can only delete their own pending requests
- Admins can approve/reject any request
- Approved opt-ins allow normal attendance marking
- These days will count in salary calculation (already handled by existing `countWorkingDaysInMonth` function)
