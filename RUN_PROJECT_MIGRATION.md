# Run Project Management Migration

## Problem
The project management tables don't exist in your Supabase database yet. That's why you're getting 500 errors when trying to create projects.

## Solution
You need to run the migration SQL script in your Supabase database.

## Steps

### Option 1: Using Supabase Dashboard (RECOMMENDED)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `lefxnipnjjzqolnynozo`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Migration**
   - Open the file: `KAN_PROJECT_MANAGEMENT_MIGRATION.sql`
   - Copy ALL the content (Ctrl+A, Ctrl+C)
   - Paste it into the SQL Editor

4. **Run the Migration**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for it to complete (should take 10-30 seconds)
   - You should see "Success. No rows returned"

5. **Verify Tables Were Created**
   - Click on "Table Editor" in the left sidebar
   - You should now see these new tables:
     - projects
     - project_lists
     - tasks
     - task_labels
     - task_label_assignments
     - task_comments
     - task_attachments
     - project_members
     - task_activities
     - project_settings

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.lefxnipnjjzqolnynozo.supabase.co:5432/postgres" < KAN_PROJECT_MANAGEMENT_MIGRATION.sql
```

## After Running Migration

1. **Verify it worked** by running:
   ```bash
   node check-project-tables.js
   ```
   
   You should see ✅ for all tables.

2. **Test creating a project** in your app
   - The 500 error should be gone
   - Projects should create successfully

## What This Migration Creates

- **10 Database Tables** for project management
- **RLS Policies** for security
- **Database Functions** for creating default lists and labels
- **Storage Bucket** for task attachments
- **Indexes** for performance

## Troubleshooting

### If you get "relation already exists" errors
This means some tables already exist. You have two options:

1. **Drop existing tables first** (WARNING: This deletes data!)
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

2. **Use the ROLLBACK script first**
   - Run `ROLLBACK_KAN_INTEGRATION.sql` first
   - Then run `KAN_PROJECT_MANAGEMENT_MIGRATION.sql`

### If you get permission errors
Make sure you're logged in as the database owner in Supabase Dashboard.

## Next Steps

After the migration is successful:
1. Rebuild your app: `npm run build`
2. Deploy the new version
3. Test creating projects in the deployed version
