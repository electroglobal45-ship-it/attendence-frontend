# Phase 1: Database Enhancement - Step by Step

## What We're Doing
Adding checklist tables and new columns to support full Trello features.

---

## Step 1: Run the SQL Migration (5 minutes)

### Instructions:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Open your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste SQL**
   - Open `TRELLO_DATABASE_ENHANCEMENTS.sql`
   - Copy ALL the content
   - Paste into Supabase SQL Editor

4. **Run the Migration**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for completion (should take 2-3 seconds)

5. **Check for Success**
   - You should see messages like:
     ```
     ✓ task_checklists table: Created
     ✓ checklist_items table: Created
     ✓ tasks.cover_type column: Added
     ✓ tasks.start_date column: Added
     ✓ All enhancements applied successfully!
     ```

### What This Does:
- ✅ Creates `task_checklists` table (for checklists)
- ✅ Creates `checklist_items` table (for checklist items)
- ✅ Adds `cover_type`, `cover_value`, `cover_size` to `tasks` table
- ✅ Adds `start_date`, `is_completed` to `tasks` table
- ✅ Adds `background_type`, `background_value`, `is_starred` to `projects` table
- ✅ Sets up RLS policies for security
- ✅ Creates helper functions for checklist progress

---

## Step 2: Test the Migration (2 minutes)

### Instructions:

1. **Open Terminal**
   - In VS Code, press `` Ctrl+` `` (backtick)
   - Or use Windows Terminal

2. **Run Test Script**
   ```bash
   node test-database-enhancements.js
   ```

3. **Check Results**
   - You should see:
     ```
     ✅ task_checklists table exists
     ✅ checklist_items table exists
     ✅ tasks table has new columns
     ✅ projects table has new columns
     ✅ Helper functions exist
     ✅ ALL TESTS PASSED!
     ```

### If Tests Fail:
- Make sure you ran the SQL migration in Step 1
- Check Supabase credentials in `.env.local`
- Check for error messages in the test output

---

## Step 3: Verify in Supabase Dashboard (Optional)

### Instructions:

1. **Go to Table Editor**
   - Click "Table Editor" in Supabase dashboard

2. **Check New Tables**
   - You should see:
     - `task_checklists` (new)
     - `checklist_items` (new)

3. **Check Updated Tables**
   - Click on `tasks` table
   - Scroll right to see new columns:
     - `cover_type`
     - `cover_value`
     - `cover_size`
     - `start_date`
     - `is_completed`

4. **Check Projects Table**
   - Click on `projects` table
   - Scroll right to see new columns:
     - `background_type`
     - `background_value`
     - `is_starred`

---

## What's Next?

After completing Phase 1, you have:
- ✅ Database ready for checklists
- ✅ Database ready for card covers
- ✅ Database ready for start dates
- ✅ Database ready for board backgrounds

**Next Phase Options:**

### Option A: Build Task Detail Modal (Recommended)
- Most visible feature
- Shows all card details
- 4-5 hours of work

### Option B: Build Drag & Drop Board
- Interactive Kanban board
- Drag cards between lists
- 3-4 hours of work

### Option C: Build Checklist API & UI
- Add checklists to cards
- Check/uncheck items
- 2-3 hours of work

---

## Troubleshooting

### Error: "relation task_checklists does not exist"
**Solution:** Run the SQL migration in Supabase SQL Editor

### Error: "column cover_type does not exist"
**Solution:** Run the SQL migration in Supabase SQL Editor

### Error: "Missing Supabase credentials"
**Solution:** Check `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Error: "permission denied"
**Solution:** Make sure you're using the service role key, not the anon key

---

## Summary

**Time Required:** 5-10 minutes
**Difficulty:** Easy (just copy-paste SQL)
**Risk:** Zero (doesn't affect attendance system)

**What You Did:**
1. ✅ Added 2 new tables (checklists)
2. ✅ Added 8 new columns (covers, dates, flags)
3. ✅ Set up RLS policies
4. ✅ Created helper functions
5. ✅ Tested everything works

**Ready for Next Phase?**
Tell me which phase you want to do next:
- "Build the modal" - Task detail modal
- "Build drag & drop" - Kanban board
- "Build checklists" - Checklist API & UI

