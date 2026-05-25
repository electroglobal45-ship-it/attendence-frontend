# 🚀 Phase 1: Database Schema Setup - Instructions

## What We've Created

✅ **KAN_PROJECT_MANAGEMENT_MIGRATION.sql** - Complete database schema  
✅ **setup-project-management.js** - Initial data setup script  
✅ **verify-project-setup.js** - Verification script  
✅ **@supabase/supabase-js** - Installed dependency  

## Step-by-Step Instructions

### Step 1: Apply Database Migration

1. **Open Supabase Dashboard**
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project: `lefxnipnjjzqolnynozo`

2. **Run the Migration**
   - Navigate to **SQL Editor**
   - Click **New Query**
   - Copy the entire contents of `KAN_PROJECT_MANAGEMENT_MIGRATION.sql`
   - Paste into the SQL editor
   - Click **Run** (or press Ctrl+Enter)

3. **Verify Success**
   - You should see success messages in the Results panel
   - Look for: "✓ All project management tables created successfully!"

### Step 2: Set Up Initial Data

```bash
# Run the setup script
node setup-project-management.js
```

**Expected Output:**
```
🚀 Setting up Project Management System...

1. Verifying database tables...
✅ Database tables verified

2. Checking for admin users...
✅ Found admin user: admin@company.com

3. Creating sample project...
✅ Sample project created: Sample Project (ID: ABC123DEF456)

4. Adding admin as project member...
✅ Admin added as project member

5. Creating default project lists...
✅ Default lists created (To Do, In Progress, Review, Done)

6. Creating default project labels...
✅ Default labels created (Bug, Feature, Enhancement, Documentation, Urgent)

7. Creating project settings...
✅ Project settings configured

8. Creating sample task...
✅ Sample task created: Welcome to Project Management

9. Verifying storage bucket...
✅ Task attachments storage bucket verified

🎉 PROJECT MANAGEMENT SETUP COMPLETE!
```

### Step 3: Verify Installation

```bash
# Run the verification script
node verify-project-setup.js
```

**Expected Output:**
```
🔍 Verifying Project Management Setup...

✅ Projects table: 1
✅ Project Lists table: 4
✅ Tasks table: 1
✅ Task Labels table: 5
✅ Project Members table: 1
✅ Task Comments table: 0
✅ Task Attachments table: 0
✅ Task Activities table: 0
✅ Project Settings table: 1
✅ Storage bucket (task-attachments): exists

🎉 All checks passed! Project management system is ready.
```

## Database Schema Overview

### Core Tables Created:

1. **projects** - Main project/board entities
2. **project_lists** - Kanban columns (To Do, In Progress, etc.)
3. **tasks** - Individual tasks/cards
4. **task_labels** - Color-coded labels for tasks
5. **task_label_assignments** - Many-to-many task-label relationships
6. **task_comments** - Comments on tasks
7. **task_attachments** - File attachments for tasks
8. **project_members** - User access to projects
9. **task_activities** - Activity log for tasks
10. **project_settings** - Project-specific configurations

### Key Features:

✅ **Row Level Security (RLS)** - Users can only access their projects  
✅ **UUID Primary Keys** - Secure, non-sequential IDs  
✅ **Public IDs** - Short, user-friendly identifiers  
✅ **Soft Deletes** - Data preservation with deleted_at timestamps  
✅ **Activity Logging** - Track all changes to tasks  
✅ **File Storage** - Supabase storage integration  
✅ **Performance Indexes** - Optimized for common queries  
✅ **Auto Timestamps** - Automatic created_at/updated_at handling  

## Integration with Existing System

### How It Connects:

- **Users**: Uses your existing `auth.users` table
- **Roles**: Extends your admin/employee role system
- **Authentication**: Works with your existing Supabase Auth
- **Storage**: Uses Supabase Storage (like your selfies bucket)

### No Conflicts:

- All new tables use `projects_*` or `tasks_*` prefixes
- No changes to existing attendance tables
- Separate storage bucket for attachments
- Independent RLS policies

## Troubleshooting

### If Migration Fails:

1. **Check Supabase Connection**
   ```sql
   SELECT NOW(); -- Should return current timestamp
   ```

2. **Check Permissions**
   - Make sure you're using the service role key
   - Verify you have admin access to the project

3. **Check for Conflicts**
   ```sql
   -- Check if tables already exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'project%';
   ```

### If Setup Script Fails:

1. **Check Environment Variables**
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Check Admin User Exists**
   - Run `node create-admin-user.js` if needed

3. **Check Database Connection**
   - Verify the migration was applied successfully

## Next Steps

Once Phase 1 is complete, we'll move to:

📋 **Phase 2: API Routes** - Create Next.js API endpoints  
🎨 **Phase 3: Frontend Components** - Build React components  
🔗 **Phase 4: Navigation Integration** - Add to existing sidebar  
✨ **Phase 5: Testing & Polish** - Test and refine features  

## Files Created in Phase 1:

```
├── KAN_PROJECT_MANAGEMENT_MIGRATION.sql    # Database schema
├── setup-project-management.js             # Initial data setup
├── verify-project-setup.js                 # Verification script
└── PHASE_1_INSTRUCTIONS.md                 # This file
```

---

**Ready to proceed?** Run the migration and setup scripts, then let me know when Phase 1 is complete! 🚀