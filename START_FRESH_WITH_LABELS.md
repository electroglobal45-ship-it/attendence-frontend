# 🚀 Start Fresh with Dynamic Labels

## Quick Start (3 Steps)

### Step 1: Delete All Old Labels
Open Supabase SQL Editor and run:

```sql
DELETE FROM task_board_labels;
DELETE FROM board_labels;
```

### Step 2: Restart Your Backend
```bash
cd backend
npm run dev
```

### Step 3: Create Labels
1. Open any task in your app
2. Click the label button (+ icon)
3. Click "Create New Label"
4. Enter name and pick color
5. Done!

---

## What's New?

✅ **No more predefined labels** - Start completely fresh
✅ **Board-specific labels** - Each board has its own labels
✅ **Custom names & colors** - Create labels exactly how you want
✅ **Simple & clean** - No more priority mapping logic

## Files Changed

### Backend (No changes needed - already done)
- ✅ `backend/src/modules/labels/labels.controller.ts`
- ✅ `backend/src/modules/labels/labels.service.ts`
- ✅ `backend/src/modules/labels/labels.routes.ts`

### Frontend (Already updated)
- ✅ `src/components/board/TaskDetailModal.tsx`
- ✅ `src/components/board/Card.tsx`
- ✅ `src/app/(employee)/my-tasks/page.tsx`

## Label Features

### Create Label
- Name: any text (e.g., "Bug", "Feature", "Priority: High")
- Color: 8 options (red, orange, yellow, green, blue, purple, pink, gray)

### Use Label
- Single label per task
- Change anytime
- Shows on card, task list, and task detail

### Manage Labels
- Create: TaskDetailModal → Labels → Create New Label
- Edit: Coming soon (use delete + recreate for now)
- Delete: Backend endpoint available

## API Endpoints

```typescript
// Get board labels
GET /api/v1/labels/boards/:boardId

// Create label
POST /api/v1/labels
Body: { board_id, name, color }

// Update label
PUT /api/v1/labels/:labelId
Body: { name?, color? }

// Delete label
DELETE /api/v1/labels/:labelId

// Assign to task (handled by task update)
PUT /api/v1/tasks/:taskId
Body: { labels: [{ id, name, color }] }
```

## Troubleshooting

### "No labels yet" showing?
✅ Good! This means old labels were deleted
👉 Click "Create New Label" to make your first one

### Backend error on startup?
Check that:
- Supabase connection is working
- Both SQL delete statements ran successfully
- No tasks have null label references

### Labels not showing on cards?
- Refresh the board page
- Check browser console for errors
- Verify task has a label assigned in TaskDetailModal

---

**That's it!** You're now ready to use fully dynamic, board-specific labels. 🎉
