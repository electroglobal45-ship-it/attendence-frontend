# Debug Labels - Step by Step

## What I Just Fixed

### Problem: Labels Not Showing in Detail Modal
Your screenshot showed the Labels section was completely empty - just the heading and a "+" button, no label badge displaying.

### Root Cause:
The label rendering code used a complex IIFE (Immediately Invoked Function Expression) that was returning `null` instead of the label badge.

### Solution Applied:
Simplified the label rendering to a straightforward conditional:
```tsx
{selectedLabel ? (
  <button>Show Label</button>
) : (
  <button>+ Add Label</button>
)}
```

## Testing Steps

### Step 1: Clear Everything and Restart

```bash
# Clear cache
clear-cache.bat

# Start backend (in backend folder)
npm run dev

# Start frontend (in root folder)
npm run dev

# Hard refresh browser
Ctrl + Shift + R
```

### Step 2: Open Browser Console

1. Press `F12` to open Developer Tools
2. Go to **Console** tab
3. Clear any existing logs

### Step 3: Open a Task

1. Click any task card to open the detail modal
2. Look at the console logs

**You should see:**
```
Task labels: Array(1) [ {id: "medium", name: "MEDIUM PRIORITY", color: "#E2B203"} ]
Processed label IDs: Array(1) [ "medium" ]
Task priority: "medium"
Initial selected label: "medium"
```

### Step 4: Check the Labels Section

In the detail modal, look at the **LABELS** section:

**✅ CORRECT - Should see:**
```
LABELS
[MEDIUM PRIORITY]  ← Clickable yellow badge
```

**❌ WRONG - If you see:**
```
LABELS
[+]  ← Only a plus button, no label badge
```

### Step 5: Test Changing Label

1. Click the label badge (e.g., [MEDIUM PRIORITY])
2. Picker should open with radio buttons
3. Click a different label (e.g., URGENT)
4. **Check console** - should see:
   ```
   Syncing label from task: urgent from labels: ["urgent"]
   ```
5. Picker should close automatically
6. Label badge should update to [URGENT PRIORITY]

### Step 6: Test Old Tasks

For tasks created before the fix:

1. Open an old task
2. **Check console** - you'll see what data it has:
   ```
   Task labels: Array(0) []  ← Old task with no labels
   Task priority: "medium"
   Initial selected label: "medium"
   ```
   OR
   ```
   Task labels: Array(3) [ {...}, {...}, {...} ]  ← Old task with multiple labels
   Processed label IDs: Array(3) [ "low", "medium", "urgent" ]
   Task priority: "medium"
   Initial selected label: "low"  ← Will use FIRST one
   ```

## Common Issues and Solutions

### Issue 1: Label section is empty (just + button)

**Console shows:**
```
Initial selected label: ""
```

**Solution:**
Task has no label data. The initialization is failing.

**Fix:**
```tsx
// Make sure we ALWAYS have a label
const initialLabel = labels.length > 0 ? labels[0] : (task.priority || 'medium')
```

This should default to the task's priority or 'medium'.

### Issue 2: Label shows but can't be changed

**Console shows:**
```
Failed to save label: 404 Not Found
```

**Solution:**
Backend endpoint issue. Check:
1. Backend is running on port 5000
2. Task ID is correct (not using public_id)
3. API route exists: `PUT /api/v1/tasks/:id`

### Issue 3: Multiple labels still showing on cards

**Solution:**
1. Run database migration: `CLEANUP_MULTIPLE_LABELS_MIGRATION.sql`
2. Check TrelloCard.tsx is using new code
3. Clear cache and hard refresh

### Issue 4: selectedLabel is undefined

**Console shows:**
```
Initial selected label: undefined
```

**This means:**
- `task.labels` is empty or undefined
- `task.priority` is also undefined
- Need to fix the fallback

**Solution in code:**
```tsx
return labels.length > 0 ? labels[0] : (task.priority || 'medium')
// This ensures we ALWAYS have a value
```

## Console Log Reference

### What Each Log Means:

1. **Task labels:** Raw label data from the task object
   - Should be an array of label objects
   - Each has `id`, `name`, `color`

2. **Processed label IDs:** Extracted IDs from label objects
   - Just the ID strings like `["medium"]`
   - Used to set selectedLabel

3. **Task priority:** The priority field from task
   - Fallback if no labels exist
   - Should be one of: `low`, `medium`, `high`, `urgent`

4. **Initial selected label:** Final computed value
   - This is what gets stored in `selectedLabel` state
   - Should NEVER be empty or undefined

5. **Syncing label from task:** When task prop changes
   - Happens when parent refreshes data
   - Shows new label being applied

## Expected Console Output Examples

### New Task (Default):
```
Task labels: []
Processed label IDs: []
Task priority: "medium"
Initial selected label: "medium"
```

### Task with Label:
```
Task labels: [{id: "urgent", name: "URGENT PRIORITY", color: "#F87168"}]
Processed label IDs: ["urgent"]
Task priority: "urgent"
Initial selected label: "urgent"
```

### Old Task with Multiple Labels (Before Migration):
```
Task labels: [
  {id: "low", name: "LOW PRIORITY", color: "#94C748"},
  {id: "medium", name: "MEDIUM PRIORITY", color: "#E2B203"},
  {id: "urgent", name: "URGENT PRIORITY", color: "#F87168"}
]
Processed label IDs: ["low", "medium", "urgent"]
Task priority: "medium"
Initial selected label: "low"  ← Takes FIRST one
```

## Quick Fixes

### If label badge doesn't show:

1. **Check console** for the initial label value
2. **Verify** `selectedLabel` state is not empty
3. **Check** PREDEFINED_LABELS array has matching ID
4. **Ensure** the conditional rendering works:
   ```tsx
   {selectedLabel ? <ShowLabel /> : <AddButton />}
   ```

### If label shows but wrong color:

1. **Check** `PREDEFINED_LABELS` mapping:
   ```tsx
   const PREDEFINED_LABELS = [
     { id: 'low', name: 'LOW PRIORITY', color: '#1D2125', bgColor: '#94C748' },
     { id: 'medium', name: 'MEDIUM PRIORITY', color: '#1D2125', bgColor: '#E2B203' },
     { id: 'high', name: 'HIGH PRIORITY', color: '#1D2125', bgColor: '#FEA362' },
     { id: 'urgent', name: 'URGENT PRIORITY', color: '#1D2125', bgColor: '#F87168' },
   ]
   ```

2. **Verify** `selectedLabel` matches one of these IDs

### If multiple labels show on card:

**Problem:** TrelloCard is rendering both labels array AND priority badge

**Fix:** Check TrelloCard.tsx shows ONLY:
```tsx
const displayLabel = task.labels && task.labels.length > 0 ? task.labels[0] : null
{displayLabel && <span>{displayLabel.name}</span>}
```

**NOT:**
```tsx
{task.labels.map(label => <span>{label.name}</span>)}  ← Wrong!
<span>{task.priority}</span>  ← Also wrong! (duplicate)
```

## Success Criteria

✅ Labels section shows ONE label badge
✅ Clicking badge opens picker
✅ Picker has radio buttons (○/●)
✅ Selecting label closes picker
✅ Label badge updates immediately
✅ Console shows correct log sequence
✅ No errors in console
✅ Card on board shows same label

## Next Steps

1. **Test with your actual tasks**
2. **Check console logs** for each task
3. **Report any issues** with console output
4. **Run database migration** if multiple labels persist
5. **Share console logs** if label still doesn't show

---

**Status**: Fixed label rendering + added debug logging
**Date**: June 6, 2026
**Version**: 2.1.0 (Debug Edition)
