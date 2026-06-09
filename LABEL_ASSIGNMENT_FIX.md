# Label Assignment Fix - Single Label Per Task

## Overview
This fix ensures that each task can have **ONLY ONE LABEL** assigned at a time. Labels can be changed from the task detail modal, and this works for both new and existing tasks.

## Changes Made

### 1. Frontend Changes (`TaskDetailModal.tsx`)

#### Before:
- Used `selectedLabels` array state allowing multiple labels
- Had `addLabel()` and `removeLabel()` functions that could add/remove multiple labels
- Used checkboxes in the label picker allowing multiple selections
- Displayed multiple label badges with X buttons to remove each

#### After:
- Changed to `selectedLabel` single string state
- New `changeLabel()` function that replaces the current label with the selected one
- Uses radio button style selection (circular indicator) in the label picker
- Displays a single label badge that opens the picker when clicked
- Clicking a label badge or the "+" button opens the label picker
- Selecting a label immediately updates the task and closes the picker

#### Key Changes:
```typescript
// OLD: Multiple labels
const [selectedLabels, setSelectedLabels] = useState<string[]>([...])

// NEW: Single label
const [selectedLabel, setSelectedLabel] = useState<string>('medium')
```

### 2. Backend Changes (`tasks.service.ts`)

#### `syncTaskLabels()` Function:
- **Before**: Processed all labels in the input array and created multiple task-label links
- **After**: Only processes the FIRST label in the array (enforces single label)
- Deletes all existing labels before assigning the new one
- If no labels provided, removes all labels from the task

#### `mergeTaskLabels()` Function:
- **Before**: Returned all associated labels for each task
- **After**: Returns only the FIRST label using `.slice(0, 1)`
- This ensures even if database has multiple labels (from old data), only one is shown

### 3. Database Cleanup

A migration SQL script is provided: `CLEANUP_MULTIPLE_LABELS_MIGRATION.sql`

**What it does:**
1. Identifies tasks with multiple labels
2. Keeps only the first label (by lowest board_label_id) for each task
3. Removes all other label assignments
4. Includes a verification query to confirm the cleanup

**How to run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `CLEANUP_MULTIPLE_LABELS_MIGRATION.sql`
3. Execute the script
4. Run the verification query at the bottom to confirm each task has only 1 label

## User Experience Changes

### Before:
- Users could select multiple priority labels (confusing!)
- Labels had X buttons to remove individual ones
- Multiple labels could appear on a single task card
- No clear indication of which priority was "active"

### After:
- Users can select exactly ONE priority label per task
- Clicking the current label badge opens the picker to change it
- Radio-style selection makes it clear only one can be active
- Clean, simple UI with single label badge
- Selecting a new label immediately replaces the old one

## Label Picker UI

### Visual Indicators:
- **Selected label**: Blue circle with white dot inside (radio button style)
- **Unselected labels**: Gray circle outline
- **Hover effect**: Gray background on hover

### Behavior:
- Opens when clicking the label badge or "+" button
- Closes automatically after selecting a label
- Can be closed by clicking outside or the X button
- Search functionality still works to filter labels
- Shows all 4 predefined priority labels:
  - LOW PRIORITY (Green)
  - MEDIUM PRIORITY (Yellow)
  - HIGH PRIORITY (Orange)
  - URGENT PRIORITY (Red)

## Technical Implementation

### API Call Flow:
1. User clicks a different label in the picker
2. `changeLabel(id)` function is called
3. State is optimistically updated
4. PUT request sent to `/api/v1/tasks/:taskId` with:
   ```json
   {
     "priority": "urgent",
     "labels": [{ 
       "id": "urgent", 
       "colorId": "urgent", 
       "name": "URGENT PRIORITY" 
     }]
   }
   ```
5. Backend `updateTask()` calls `syncTaskLabels()` with the labels array
6. `syncTaskLabels()` extracts only the FIRST label and updates the database
7. Activities are logged
8. Parent component is notified to refresh
9. Label picker closes automatically

### Error Handling:
- If API call fails, previous label is restored
- Error is logged to console
- User sees the label revert to previous value

## Compatibility with Existing Code

### Board Views:
- KanbanView, ToDoListView, and TrelloBoard all display labels
- They receive labels as an array but will now only have 0 or 1 items
- No changes needed to these components
- They'll automatically show single label badge

### Task Creation:
- New tasks default to 'medium' priority if no label specified
- `quickCreateTask()` sets priority to 'medium' by default
- Users can change the label immediately after creation

### Old Tasks:
- Tasks created before this fix may have multiple labels in the database
- The `mergeTaskLabels()` function now only returns the first label
- Run the cleanup migration to remove duplicate labels from database
- Even without migration, UI will only show/edit one label

## Testing Checklist

- [x] Open existing task → Label section shows only one label
- [x] Click label badge → Picker opens
- [x] Select different label → Old label replaced with new one
- [x] Picker closes automatically after selection
- [x] Label updates in task card on board view
- [x] Create new task → Default to medium priority
- [x] Change label on new task → Works correctly
- [x] Search in label picker → Filters labels correctly
- [x] Click outside picker → Picker closes without changing label
- [x] Network error during label change → Label reverts to previous

## Files Modified

1. `src/components/kanban/TaskDetailModal.tsx`
   - Changed state from array to single value
   - Replaced add/remove functions with change function
   - Updated UI to show single label with picker
   - Changed checkbox UI to radio button style

2. `backend/src/modules/tasks/tasks.service.ts`
   - Modified `syncTaskLabels()` to enforce single label
   - Modified `mergeTaskLabels()` to return only first label

3. `CLEANUP_MULTIPLE_LABELS_MIGRATION.sql` (NEW)
   - Database cleanup script

4. `LABEL_ASSIGNMENT_FIX.md` (THIS FILE)
   - Documentation of changes

## Next Steps

1. **Run the database cleanup migration** to remove duplicate labels from existing tasks
2. **Test thoroughly** with both new and old tasks
3. **Clear browser cache** if labels don't update immediately
4. **Verify** that task activities log label changes correctly
5. **Monitor** for any issues with label display in board views

## Rollback Plan

If issues occur, you can rollback by:

1. Restore the previous versions of the modified files from git
2. The database migration is one-way, but won't break anything
3. Old code will work fine with single-label data

## Known Limitations

- Cannot assign multiple priority labels (this is intentional)
- Once a label is assigned, there's no "remove label" option (must select a different one)
- If you want to allow "no label", you'd need to add a "NONE" option to the predefined labels

## Future Enhancements

Possible improvements:
1. Add a "No Label" or "Unassigned" option
2. Allow custom label creation (beyond the 4 predefined priorities)
3. Add label filtering in board views
4. Show label change history in activity feed
5. Keyboard shortcuts for quick label changes (1-4 keys)

---

**Implementation Date**: June 6, 2026  
**Status**: ✅ Complete  
**Breaking Changes**: None (backward compatible)
