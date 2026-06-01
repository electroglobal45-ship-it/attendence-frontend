# Fix: New Employee Cannot Mark Attendance (Unauthorized Error)

## Problem
When a new employee tries to mark attendance, they get an "Unauthorized" error.

## Root Causes & Solutions

### 1. **Employee Must Log In First**

**Issue:** New employees created by admin don't have an active session.

**Solution:**
1. After creating a new employee, give them the temporary password
2. Employee must log in at `/login` page first
3. After successful login, they can mark attendance

**Steps for New Employee:**
```
1. Go to: http://localhost:3000/login
2. Enter email and temporary password (provided by admin)
3. After login, go to attendance page
4. Now they can mark attendance
```

---

### 2. **RLS (Row Level Security) Policies**

**Issue:** Supabase RLS might be blocking new employees from inserting attendance records.

**Solution:** Run the SQL file `FIX_ATTENDANCE_RLS.sql` in Supabase SQL Editor.

This will:
- Allow employees to insert their own attendance (`employee_id = auth.uid()`)
- Allow employees to view their own attendance
- Allow admins to view/manage all attendance

---

### 3. **Check Supabase Auth Session**

**Issue:** Employee's auth session might not be properly set.

**Debug Steps:**

1. Open browser console (F12)
2. Check if auth token exists:
```javascript
localStorage.getItem('authToken')
```

3. If null or undefined, employee needs to log in again

---

### 4. **Verify Employee Account is Active**

**SQL Query to Check:**
```sql
SELECT id, email, name, role, is_active 
FROM users 
WHERE email = 'employee@example.com';
```

**Fix if inactive:**
```sql
UPDATE users 
SET is_active = true 
WHERE email = 'employee@example.com';
```

---

### 5. **Check API Logs**

When employee tries to mark attendance, check the server logs for:

```
✅ Token verified for user: [user-id]
✅ User authenticated: [email] role: employee
```

If you see:
```
❌ No Bearer token found
❌ Invalid token
❌ User inactive
```

Then the employee needs to log in again.

---

## Quick Fix Checklist

- [ ] Employee has logged in at least once with temporary password
- [ ] Employee's `is_active` is `true` in database
- [ ] RLS policies are set correctly (run `FIX_ATTENDANCE_RLS.sql`)
- [ ] Auth token exists in browser localStorage
- [ ] Employee is accessing from correct URL (not localhost:3001 if app is on 3000)

---

## Testing Steps

1. **Create new employee** (as admin)
2. **Copy temporary password**
3. **Log out** from admin account
4. **Log in** as new employee with temp password
5. **Go to attendance page**
6. **Try marking attendance**
7. Should work now ✅

---

## Common Errors & Fixes

### Error: "Unauthorized"
**Cause:** No auth session
**Fix:** Employee must log in first

### Error: "Forbidden"
**Cause:** RLS policy blocking
**Fix:** Run `FIX_ATTENDANCE_RLS.sql`

### Error: "User inactive"
**Cause:** `is_active = false` in database
**Fix:** Update user to `is_active = true`

### Error: "Failed to fetch office location"
**Cause:** No office location configured
**Fix:** Admin must set office location in Settings

---

## Prevention

To avoid this issue in the future:

1. **Always tell new employees to log in first** before marking attendance
2. **Verify RLS policies** are set correctly after any database changes
3. **Test with a dummy employee** after making auth changes

---

## Still Not Working?

If the issue persists:

1. Check browser console for errors
2. Check server logs (terminal where `npm run dev` is running)
3. Verify Supabase project is not paused
4. Check if SUPABASE_SERVICE_ROLE_KEY is set in `.env.local`
5. Try clearing browser cache and localStorage
6. Try in incognito/private browsing mode

---

## SQL to Run

Run this in Supabase SQL Editor:

```sql
-- 1. Fix RLS policies
\i FIX_ATTENDANCE_RLS.sql

-- 2. Verify employee exists and is active
SELECT id, email, name, role, is_active 
FROM users 
WHERE role = 'employee'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if employee has any attendance records
SELECT a.*, u.email, u.name
FROM attendance a
JOIN users u ON a.employee_id = u.id
WHERE u.role = 'employee'
ORDER BY a.date DESC
LIMIT 10;
```
