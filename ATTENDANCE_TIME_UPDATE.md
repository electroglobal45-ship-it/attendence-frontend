# Attendance Time Policy Update

## Changes Made

### Office End Time Extended: 6:00 PM → 6:30 PM

The office end time has been updated from 6:00 PM to 6:30 PM. This affects:

1. **Check-in Restrictions**
   - Previously: Check-in blocked after 6:00 PM (1080 minutes)
   - Now: Check-in blocked after 6:30 PM (1110 minutes)

2. **Evening Short Leave**
   - Previously: Cannot leave before 4:00 PM (6:00 PM - 2h)
   - Now: Cannot leave before 4:30 PM (6:30 PM - 2h)

## Files Modified

### 1. `src/constants/policy.ts`
```typescript
// Office end time
export const OFFICE_END_HOUR = 18    // 6:30 PM
export const OFFICE_END_MINUTE = 30  // Changed from 0 to 30

// Evening short leave earliest time
export const EVENING_SHORT_LEAVE_EARLIEST_HOUR = 16
export const EVENING_SHORT_LEAVE_EARLIEST_MINUTE = 30  // Changed from 0 to 30
```

### 2. `src/app/(employee)/attendance/page.tsx`
- Updated check-in blocking time from 1080 minutes (6:00 PM) to 1110 minutes (6:30 PM)
- Updated error message to reflect "6:30 PM" instead of "6:00 PM"

### 3. `src/app/api/attendance/mark/route.ts`
- Updated API validation to block check-in after 1110 minutes (6:30 PM)
- Updated error message to reflect "6:30 PM" instead of "6:00 PM"

## Impact

### Employees Can Now:
- Mark attendance (check-in) until 6:30 PM instead of 6:00 PM
- Take evening short leave starting from 4:30 PM instead of 4:00 PM

### No Changes To:
- Morning office start time (9:00 AM)
- Late buffer window (9:05 AM - 9:30 AM)
- Half-day check-in time (after 9:30 AM)
- Morning short leave deadline (11:05 AM)
- Short leave duration (2 hours max)
- Monthly short leave limit (2 per month)

## Testing Recommendations

1. **Test Check-in at 6:15 PM** - Should be allowed
2. **Test Check-in at 6:35 PM** - Should be blocked with "Office hours ended at 6:30 PM" message
3. **Test Evening Short Leave at 4:25 PM** - Should be blocked
4. **Test Evening Short Leave at 4:35 PM** - Should be allowed
5. **Verify existing attendance records** - No impact on historical data

## Deployment Notes

- No database migration required
- Changes are in application logic only
- Restart the application after deployment to apply changes
- Clear browser cache if needed for frontend updates
