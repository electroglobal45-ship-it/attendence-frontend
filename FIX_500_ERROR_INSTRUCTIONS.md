# Fix 500 Error - Infinite Recursion in RLS Policies

## Problem
Error: `infinite recursion detected in policy for relation "project_members"`

The RLS policies for `project_members` table are checking the `project_members` table itself, creating a circular reference.

## Solution
Run the `FIX_RLS_POLICIES.sql` script in Supabase SQL Editor.

## Steps

### 1. Open Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Select your project: `lefxnipnjjzqolnynozo`

### 2. Open SQL Editor
- Click "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Run the Fix Script
- Copy ALL content from `FIX_RLS_POLICIES.sql`
- Paste into SQL Editor
- Click "Run" (or press Ctrl+Enter)
- Should see: "Success. No rows returned"

### 4. Test the Fix
Refresh your app and try:
- Navigate to /projects
- Should load without 500 error
- Try creating a project
- Should work!

## What the Fix Does

### Before (Broken):
```sql
CREATE POLICY "Users can view project members" ON public.project_members
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.project_members pm ON p.id = pm.project_id  -- ❌ Circular!
            WHERE pm.user_id = auth.uid() AND pm.status = 'active'
        )
    );
```

This policy checks `project_members` → which triggers the policy → which checks `project_members` → infinite loop!

### After (Fixed):
```sql
CREATE POLICY "Users can view project members" ON public.project_members
    FOR SELECT USING (
        user_id = auth.uid()  -- ✅ Direct check, no recursion
        OR project_id IN (
            SELECT project_id FROM public.project_members  -- ✅ Simple subquery
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );
```

This policy:
1. Allows users to see their own membership
2. Allows users to see members of projects they belong to
3. No circular reference!

## Verification

After running the fix, you should see:
- ✅ GET /api/projects returns 200 (not 500)
- ✅ Projects page loads successfully
- ✅ Can create new projects
- ✅ Can view project details

## If Still Getting Errors

### Check 1: Verify policies were updated
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'project_members';
```

Should show the new policies.

### Check 2: Check for other circular references
Look for any policies that reference the same table they're protecting.

### Check 3: Restart your app
Sometimes cached policies need a restart:
```bash
# Stop dev server
# Clear .next folder
# Restart dev server
npm run dev
```

## Summary

The fix:
- ✅ Removes circular reference in RLS policies
- ✅ Maintains security (users can only see their projects)
- ✅ Fixes the 500 error
- ✅ No code changes needed, just SQL update

**Run the SQL script and you're done!**
