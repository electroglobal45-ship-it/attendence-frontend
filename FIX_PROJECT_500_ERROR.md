# Fix: 500 Error When Creating Projects

## Problem Summary
When trying to create a project in the deployed app, you get:
- ❌ "Failed to create project" 
- ❌ 500 Internal Server Error
- ❌ Console shows: "the server responded with a status of 500 (Internal Server Error)"

## Root Cause
**The project management database tables don't exist in your Supabase database yet.**

The migration SQL script (`KAN_PROJECT_MANAGEMENT_MIGRATION.sql`) was created but never run on your actual database.

## Solution: Run the Migration

### Step 1: Open Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Login to your account
3. Select your project: `lefxnipnjjzqolnynozo`

### Step 2: Run the Migration SQL

1. Click **"SQL Editor"** in the left sidebar
2. Click **"New Query"** button
3. Open the file `KAN_PROJECT_MANAGEMENT_MIGRATION.sql` in your code editor
4. Copy **ALL** the content (Ctrl+A, Ctrl+C)
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** button (or press Ctrl+Enter)
7. Wait 10-30 seconds for it to complete
8. You should see: **"Success. No rows returned"**

### Step 3: Verify Tables Were Created

1. Click **"Table Editor"** in the left sidebar
2. You should now see these **10 new tables**:
   - ✅ projects
   - ✅ project_lists
   - ✅ tasks
   - ✅ task_labels
   - ✅ task_label_assignments
   - ✅ task_comments
   - ✅ task_attachments
   - ✅ project_members
   - ✅ task_activities
   - ✅ project_settings

### Step 4: Rebuild and Deploy

1. **Rebuild your app:**
   ```bash
   npm run build
   ```

2. **Deploy the new version** to your hosting platform

3. **Test creating a project** - it should work now!

## What the Migration Creates

### Database Tables (10 total)
- **projects** - Main project information
- **project_lists** - Kanban columns (To Do, In Progress, etc.)
- **tasks** - Individual tasks/cards
- **task_labels** - Labels for categorizing tasks
- **task_label_assignments** - Links tasks to labels
- **task_comments** - Comments on tasks
- **task_attachments** - File attachments on tasks
- **project_members** - Users assigned to projects
- **task_activities** - Activity log for tasks
- **project_settings** - Project configuration

### Security (RLS Policies)
- Row Level Security enabled on all tables
- Policies for SELECT, INSERT, UPDATE, DELETE
- User can only access projects they're members of

### Database Functions
- `create_default_project_lists()` - Creates 4 default lists
- `create_default_project_labels()` - Creates 5 default labels

### Storage
- `task-attachments` bucket for file uploads

### Performance
- Indexes on foreign keys and frequently queried columns

## Verify Migration Worked

Run this command to check:
```bash
node check-project-tables.js
```

You should see:
```
✅ Table 'projects' exists
✅ Table 'project_lists' exists
✅ Table 'tasks' exists
... (all 10 tables)
✅ Function create_default_project_lists exists
✅ Function create_default_project_labels exists
```

## Troubleshooting

### Error: "relation already exists"
Some tables already exist. Options:

**Option A: Drop and recreate (DELETES DATA!)**
```sql
DROP TABLE IF EXISTS task_activities CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS task_label_assignments CASCADE;
DROP TABLE IF EXISTS task_labels CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS project_lists CASCADE;
DROP TABLE IF EXISTS project_settings CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
```
Then run the migration again.

**Option B: Use rollback script first**
1. Run `ROLLBACK_KAN_INTEGRATION.sql` in SQL Editor
2. Then run `KAN_PROJECT_MANAGEMENT_MIGRATION.sql`

### Error: "permission denied"
Make sure you're logged in as the database owner in Supabase Dashboard.

### Still getting 500 error after migration
1. Check browser console for detailed error
2. Check your deployment logs
3. Make sure you rebuilt and redeployed after running migration
4. Clear browser cache and try again

## Code Changes Made

I also updated the API route to handle missing database functions gracefully:
- If `create_default_project_lists()` doesn't exist, it creates lists manually
- If `create_default_project_labels()` doesn't exist, it creates labels manually
- This provides a fallback in case the functions aren't created

File updated: `src/app/api/projects/route.ts`

## Next Steps After Migration

1. ✅ Run migration in Supabase Dashboard
2. ✅ Verify tables exist
3. ✅ Rebuild app: `npm run build`
4. ✅ Deploy new version
5. ✅ Test creating a project
6. ✅ Test the full Kanban board functionality

## Need Help?

If you're still having issues:
1. Share the exact error message from browser console
2. Share the error from your deployment logs
3. Confirm which step you're stuck on
