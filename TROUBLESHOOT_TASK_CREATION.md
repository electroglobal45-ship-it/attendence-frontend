# Troubleshooting: Failed to Create Task

## The Problem

You're getting "Error: Failed to create task" when trying to create a task. This is because the `tasks` table still requires `project_id` and `list_id` to be set.

## The Solution (3 Steps)

### Step 1: Run the SQL Migration

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Open your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste**
   - Open the file: `RUN_THIS_FIRST.sql`
   - Copy ALL the content
   - Paste into Supabase SQL Editor

4. **Run the Script**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for it to complete

5. **Check the Output**
   - You should see:
     ```
     ✓ SUCCESS! Tasks can now be created without projects
     ✓ Test task created successfully
     ✓ Test task deleted
     ✓ Migration complete!
     ```

### Step 2: Verify Database Changes

Run this query in Supabase SQL Editor:

```sql
SELECT 
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
AND column_name IN ('project_id', 'list_id');
```

**Expected Result:**
```
column_name  | is_nullable | column_default
-------------|-------------|---------------
project_id   | YES         | NULL
list_id      | YES         | NULL
```

If you see `NO` instead of `YES`, the migration didn't work.

### Step 3: Test Task Creation

**Option A: Test with Node Script**

```bash
node test-task-creation.js
```

This will:
- Check if columns are nullable
- Find admin and employee users
- Try to create a test task
- Delete the test task
- Show you exactly what's wrong if it fails

**Option B: Test in Supabase SQL Editor**

```sql
-- Get admin and employee IDs first
SELECT id, name, role FROM users WHERE role IN ('admin', 'employee');

-- Then try to create a task (replace the UUIDs)
INSERT INTO tasks (
    title,
    description,
    assigned_to,
    created_by,
    priority,
    status,
    position,
    project_id,
    list_id
) VALUES (
    'Test Task',
    'Testing',
    'employee-uuid-here',
    'admin-uuid-here',
    'medium',
    'todo',
    0,
    NULL,
    NULL
);

-- If successful, delete it
DELETE FROM tasks WHERE title = 'Test Task' AND project_id IS NULL;
```

**Option C: Test in UI**

1. Restart your dev server: `npm run dev`
2. Login as admin
3. Go to `/tasks`
4. Click "New Task"
5. Fill in the form
6. Click "Create Task"
7. Open browser console (F12) to see detailed error

---

## Common Errors and Fixes

### Error: "null value in column 'project_id' violates not-null constraint"

**Cause:** The migration didn't run or failed

**Fix:**
1. Run `RUN_THIS_FIRST.sql` again
2. Make sure you're running it in the correct Supabase project
3. Check for any error messages in the SQL output

### Error: "violates foreign key constraint"

**Cause:** Foreign key constraints still exist

**Fix:**
Run this in Supabase SQL Editor:

```sql
-- Drop all foreign key constraints
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey CASCADE;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_list_id_fkey CASCADE;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_project CASCADE;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_list CASCADE;
```

### Error: "Failed to create task" (no details)

**Cause:** RLS policy blocking the insert

**Fix:**
Run this in Supabase SQL Editor:

```sql
-- Update RLS policy for admins
DROP POLICY IF EXISTS "Admins can create tasks" ON tasks;
CREATE POLICY "Admins can create tasks" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
```

### Error: "permission denied for table tasks"

**Cause:** RLS is blocking access

**Fix:**
Temporarily disable RLS to test:

```sql
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
```

Try creating a task. If it works, the issue is RLS policies.

Then re-enable RLS:

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

And fix the policies using `RUN_THIS_FIRST.sql`

---

## Debugging Checklist

Use this checklist to debug the issue:

- [ ] **Step 1:** Ran `RUN_THIS_FIRST.sql` in Supabase
- [ ] **Step 2:** Verified `project_id` is nullable (is_nullable = YES)
- [ ] **Step 3:** Verified `list_id` is nullable (is_nullable = YES)
- [ ] **Step 4:** Checked no foreign key constraints exist
- [ ] **Step 5:** Verified RLS policies allow admin to insert
- [ ] **Step 6:** Restarted dev server (`npm run dev`)
- [ ] **Step 7:** Cleared browser cache (Ctrl+Shift+Delete)
- [ ] **Step 8:** Checked browser console for errors (F12)
- [ ] **Step 9:** Verified auth token exists in localStorage
- [ ] **Step 10:** Tested with `test-task-creation.js` script

---

## Still Not Working?

### Get Detailed Error Information

1. **Open browser console** (F12)
2. **Go to Network tab**
3. **Try to create a task**
4. **Click on the failed request** (`/api/tasks/create`)
5. **Look at the Response tab**
6. **Copy the error message**

The error will tell you exactly what's wrong:
- `null value in column` → Column is still NOT NULL
- `foreign key constraint` → Foreign key still exists
- `permission denied` → RLS policy issue
- `not found` → API route issue

### Manual Database Fix

If the SQL script doesn't work, try this manual approach:

```sql
-- 1. Check current constraints
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'tasks'::regclass;

-- 2. Drop each constraint manually
ALTER TABLE tasks DROP CONSTRAINT constraint_name_here;

-- 3. Make columns nullable
ALTER TABLE tasks ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN list_id DROP NOT NULL;

-- 4. Verify
\d tasks
```

---

## Quick Test Commands

### Test 1: Check Table Structure
```sql
\d tasks
```

### Test 2: Check Constraints
```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'tasks'::regclass;
```

### Test 3: Check RLS Policies
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tasks';
```

### Test 4: Try Direct Insert
```sql
INSERT INTO tasks (title, assigned_to, created_by, priority, status, position, project_id, list_id)
VALUES ('Test', 'user-id', 'admin-id', 'medium', 'todo', 0, NULL, NULL);
```

---

## Success Indicators

You'll know it's working when:

1. ✅ SQL migration shows "SUCCESS!"
2. ✅ `is_nullable = YES` for both columns
3. ✅ Test script creates and deletes task successfully
4. ✅ UI creates task without error
5. ✅ Task appears in the "To Do" column
6. ✅ Browser console shows no errors

---

## Need More Help?

If you're still stuck:

1. Run `test-task-creation.js` and share the output
2. Share the error from browser console (F12)
3. Share the output of this SQL query:
   ```sql
   SELECT column_name, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'tasks'
   AND column_name IN ('project_id', 'list_id');
   ```

This will help identify the exact issue!
