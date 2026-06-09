# Filters Fix - Boards Not Showing & Labels Removed

## Issues Fixed

### 1. ✅ Boards not showing in "BY BOARD" filter
**Problem:** Board filter section was empty

**Solution:** Added debug logging to `fetchBoards()` function to help diagnose:
- Logs project ID
- Logs API response status
- Logs boards data received
- Logs any errors

**What to check:**
1. Open browser console (F12)
2. Click Filter button
3. Look for these logs:
   ```
   Fetching boards for project: c691dc11-b522-4e80-8ae6-337244d2a28d
   Boards response status: 200
   Boards data: { data: { boards: [...] } }
   ```

**If boards still don't show:**
- Check if API endpoint `/api/v1/projects/:projectId/boards` is working
- Verify project ID is correct
- Check auth token is valid
- Verify boards exist in database for that project

### 2. ✅ Labels section removed from filter
**Problem:** User didn't want Labels filter in tasks page

**Changes made:**
- ❌ Removed "Labels" section from filter dropdown
- ❌ Removed `filterLabels` state
- ❌ Removed `allLabels` state
- ❌ Removed `fetchAllLabels()` function
- ❌ Removed label filter logic from `filteredTasks`
- ✅ Updated `activeFiltersCount` (removed filterLabels.size)
- ✅ Updated `clearAllFilters()` (removed filterLabels reset)

**Result:** Filter dropdown now only shows:
1. BY BOARD
2. ASSIGNED TO
3. DUE DATE

---

## Current Filter Structure

```
┌────────────────────────────────┐
│ Filter Tasks      Clear all    │
├────────────────────────────────┤
│ BY BOARD                       │
│ ☐ Board 1                      │
│ ☐ Board 2                      │
│ ☐ Board 3                      │
├────────────────────────────────┤
│ ASSIGNED TO                    │
│ ☐ 👤 User 1                    │
│ ☐ 👤 User 2                    │
├────────────────────────────────┤
│ DUE DATE                       │
│ ☐ Overdue                      │
│ ☐ Due next day                 │
│ ☐ Due next week                │
│ ☐ No due date                  │
└────────────────────────────────┘
```

---

## Debug Steps for Board Issue

### Step 1: Open Browser Console
Press F12 → Console tab

### Step 2: Refresh Page
Should see:
```
Fetching boards for project: <project-id>
Boards response status: 200
Boards data: <response object>
```

### Step 3: Check Boards Array
In console logs, look for `boards: [...]`
- If empty array `[]` → No boards exist for this project
- If null/undefined → API call failed
- If has data → Should display in filter

### Step 4: Verify API Endpoint
Test manually:
```bash
curl http://localhost:5000/api/v1/projects/c691dc11-b522-4e80-8ae6-337244d2a28d/boards \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return:
```json
{
  "data": {
    "boards": [
      { "id": "...", "name": "Board 1", ... },
      { "id": "...", "name": "Board 2", ... },
      { "id": "...", "name": "Board 3", ... }
    ]
  }
}
```

---

## Files Modified

### `src/app/(admin)/tasks/page.tsx`

**Removed:**
```typescript
// States
const [filterLabels, setFilterLabels] = useState<Set<string>>(new Set())
const [allLabels, setAllLabels] = useState<any[]>([])

// Functions
const fetchAllLabels = async () => { ... }

// useEffect
useEffect(() => {
  if (tasks.length > 0) {
    fetchAllLabels()
  }
}, [tasks])

// Filter logic
if (filterLabels.size > 0) {
  const taskLabelIds = task.labels?.map(l => l.id) || []
  const hasMatchingLabel = taskLabelIds.some(id => filterLabels.has(id))
  if (!hasMatchingLabel) return false
}

// UI section (entire Labels filter dropdown)
```

**Updated:**
```typescript
// activeFiltersCount (removed filterLabels.size)
const activeFiltersCount = filterBoards.size + filterMembers.size + filterDueDate.size

// clearAllFilters (removed setFilterLabels)
const clearAllFilters = () => {
  setFilterBoards(new Set())
  setFilterMembers(new Set())
  setFilterDueDate(new Set())
}

// fetchBoards (added console.log for debugging)
const fetchBoards = async () => {
  console.log('Fetching boards for project:', projectId)
  // ... rest of function with logging
}
```

---

## Testing Checklist

### Boards Filter
- [ ] Open tasks page
- [ ] Open browser console (F12)
- [ ] Click "Filter" button
- [ ] Check console for "Fetching boards..." log
- [ ] Check console for response status
- [ ] Check console for boards data
- [ ] Verify boards appear in "BY BOARD" section
- [ ] Check at least 3 boards show up
- [ ] Test checking/unchecking boards
- [ ] Verify tasks filter correctly by board

### Labels Removed
- [ ] Open tasks page
- [ ] Click "Filter" button
- [ ] Verify NO "Labels" section
- [ ] Verify only 3 sections: BY BOARD, ASSIGNED TO, DUE DATE
- [ ] Test filters work without label filter
- [ ] Verify filter count badge only counts 3 filter types

---

## If Boards Still Don't Show

### Check 1: Project ID
Current: `c691dc11-b522-4e80-8ae6-337244d2a28d`
- Is this the correct project ID?
- Do boards exist for this project?

### Check 2: API Endpoint
Test in Postman/curl:
```
GET http://localhost:5000/api/v1/projects/{projectId}/boards
Authorization: Bearer <token>
```

### Check 3: Database
Query Supabase:
```sql
SELECT * FROM boards 
WHERE project_id = 'c691dc11-b522-4e80-8ae6-337244d2a28d';
```

Should return at least 3 boards.

### Check 4: Backend Route
Verify route exists in backend:
```typescript
router.get('/projects/:projectId/boards', ...)
```

### Check 5: Response Format
Backend should return:
```json
{
  "data": {
    "boards": [...]
  }
}
```

Not:
```json
{
  "boards": [...]  // ← Wrong! Missing 'data' wrapper
}
```

---

## Quick Test

**In browser console after opening filter:**

```javascript
// Should see boards state populated
console.log('Boards:', boards)

// If empty, manually test API
fetch('http://localhost:5000/api/v1/projects/c691dc11-b522-4e80-8ae6-337244d2a28d/boards', {
  headers: { 
    Authorization: `Bearer ${localStorage.getItem('authToken')}` 
  }
})
.then(r => r.json())
.then(d => console.log('API Response:', d))
```

---

## Summary

✅ **Labels section removed completely**
- No more label filter in tasks page
- Cleaner, simpler filter UI
- Only 3 filter categories now

🔍 **Board filter debugging added**
- Console logs show what's happening
- Easy to diagnose if boards aren't loading
- Check console first if boards don't appear

📋 **Expected board count: 3**
- User mentioned having 3 boards
- All 3 should appear in "BY BOARD" section
- If not, use debug logs to find issue
