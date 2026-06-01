# Phase 1: Quick Start (5 Minutes)

## 🎯 Goal
Add checklist tables and new columns to database.

---

## 📋 Checklist

### Step 1: Run SQL Migration
- [ ] Open Supabase Dashboard (https://supabase.com)
- [ ] Click "SQL Editor" → "New query"
- [ ] Open `TRELLO_DATABASE_ENHANCEMENTS.sql`
- [ ] Copy ALL content
- [ ] Paste into SQL Editor
- [ ] Click "Run" (or Ctrl+Enter)
- [ ] Wait for success message

### Step 2: Test Migration
- [ ] Open terminal in VS Code
- [ ] Run: `node test-database-enhancements.js`
- [ ] Check for "✅ ALL TESTS PASSED!"

### Step 3: Verify (Optional)
- [ ] Go to Supabase → Table Editor
- [ ] See `task_checklists` table
- [ ] See `checklist_items` table
- [ ] Check `tasks` table has new columns

---

## ✅ Success Criteria

You're done when:
1. SQL migration runs without errors
2. Test script shows all tests passed
3. New tables visible in Supabase

---

## 🚀 What's Next?

After this phase, choose:
- **Option A:** Build Task Detail Modal (most visible)
- **Option B:** Build Drag & Drop Board (most interactive)
- **Option C:** Build Checklist API (foundation)

---

## 📞 Need Help?

**Common Issues:**

**Q: SQL fails with "already exists" error**
A: That's OK! It means tables already exist. Continue to test.

**Q: Test script fails**
A: Check `.env.local` has correct Supabase credentials.

**Q: Can't find SQL Editor**
A: In Supabase dashboard, look for "SQL Editor" in left sidebar.

---

## 📊 What You're Adding

### New Tables (2)
```
task_checklists
├── id
├── task_id (FK)
├── title
├── position
└── timestamps

checklist_items
├── id
├── checklist_id (FK)
├── content
├── is_completed
├── position
├── due_date
├── assigned_to (FK)
└── timestamps
```

### New Columns (8)
```
tasks table:
├── cover_type (color/image/none)
├── cover_value (hex or image URL)
├── cover_size (half/full)
├── start_date
└── is_completed

projects table:
├── background_type (color/gradient/image)
├── background_value
└── is_starred
```

---

**Time:** 5-10 minutes
**Difficulty:** ⭐ Easy
**Risk:** Zero (separate tables)

