# 🧪 Project Management Integration - Testing Guide

## Pre-Testing Checklist

Before testing, ensure:

- [ ] Database migration has been run (`KAN_PROJECT_MANAGEMENT_MIGRATION.sql`)
- [ ] Application is running (`npm run dev`)
- [ ] You're logged in as an admin user
- [ ] Browser DevTools is open (F12) to monitor errors

---

## Test Suite 1: Database Verification

### Test 1.1: Verify Tables Exist

**Run in Supabase SQL Editor:**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'projects', 'project_lists', 'tasks', 'task_labels', 
    'task_label_assignments', 'task_comments', 'task_attachments',
    'project_members', 'task_activities', 'project_settings'
  )
ORDER BY table_name;
```

**Expected Result**: 10 rows

**Status**: [ ] PASS [ ] FAIL

---

### Test 1.2: Verify Storage Bucket

**Run in Supabase SQL Editor:**

```sql
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'task-attachments';
```

**Expected Result**: 1 row with `task-attachments`

**Status**: [ ] PASS [ ] FAIL

---

### Test 1.3: Verify RLS Policies

**Run in Supabase SQL Editor:**

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('projects', 'tasks', 'project_members')
ORDER BY tablename, policyname;
```

**Expected Result**: Multiple policies for each table

**Status**: [ ] PASS [ ] FAIL

---

## Test Suite 2: API Endpoints

### Test 2.1: Create Project

**Method**: POST  
**Endpoint**: `/api/projects`  
**Headers**:
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "name": "Test Project Alpha",
  "description": "Testing project creation",
  "color": "#3B82F6"
}
```

**Expected Response**:
```json
{
  "success": true,
  "project": {
    "id": "uuid-here",
    "public_id": "12-char-id",
    "name": "Test Project Alpha",
    ...
  }
}
```

**How to Test**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run:
```javascript
const token = localStorage.getItem('authToken')
fetch('/api/projects', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Test Project Alpha',
    description: 'Testing project creation',
    color: '#3B82F6'
  })
})
.then(r => r.json())
.then(data => console.log('✅ Project created:', data))
.catch(err => console.error('❌ Error:', err))
```

**Status**: [ ] PASS [ ] FAIL  
**Notes**: _______________

---

### Test 2.2: List Projects

**Method**: GET  
**Endpoint**: `/api/projects`

**How to Test**:
```javascript
const token = localStorage.getItem('authToken')
fetch('/api/projects', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('✅ Projects:', data))
.catch(err => console.error('❌ Error:', err))
```

**Expected**: Array of projects including the one created above

**Status**: [ ] PASS [ ] FAIL

---

### Test 2.3: Get Project Details

**Method**: GET  
**Endpoint**: `/api/projects/[id]`

**How to Test**:
```javascript
const token = localStorage.getItem('authToken')
const projectId = 'PROJECT_ID_FROM_PREVIOUS_TEST'

fetch(`/api/projects/${projectId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('✅ Project details:', data))
.catch(err => console.error('❌ Error:', err))
```

**Expected**: Project object with details

**Status**: [ ] PASS [ ] FAIL

---

### Test 2.4: Create Task

**Method**: POST  
**Endpoint**: `/api/tasks`

**How to Test**:
```javascript
const token = localStorage.getItem('authToken')
const projectId = 'PROJECT_ID_HERE'
const listId = 'LIST_ID_HERE' // Get from project lists

fetch('/api/tasks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Test Task 1',
    description: 'Testing task creation',
    list_id: listId,
    project_id: projectId,
    priority: 'medium'
  })
})
.then(r => r.json())
.then(data => console.log('✅ Task created:', data))
.catch(err => console.error('❌ Error:', err))
```

**Expected**: Task object with ID

**Status**: [ ] PASS [ ] FAIL

---

### Test 2.5: Move Task

**Method**: POST  
**Endpoint**: `/api/tasks/move`

**How to Test**:
```javascript
const token = localStorage.getItem('authToken')
const taskId = 'TASK_ID_HERE'
const sourceListId = 'SOURCE_LIST_ID'
const destListId = 'DEST_LIST_ID'

fetch('/api/tasks/move', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    task_id: taskId,
    source_list_id: sourceListId,
    destination_list_id: destListId,
    destination_position: 0
  })
})
.then(r => r.json())
.then(data => console.log('✅ Task moved:', data))
.catch(err => console.error('❌ Error:', err))
```

**Expected**: Success response with updated task

**Status**: [ ] PASS [ ] FAIL

---

## Test Suite 3: Frontend Components

### Test 3.1: Projects Page

**URL**: `/projects`

**Steps**:
1. Navigate to `/projects`
2. Check if page loads without errors
3. Check if "Create Project" button exists
4. Check if projects list is displayed

**Expected**:
- [ ] Page loads successfully
- [ ] No console errors
- [ ] Create button visible
- [ ] Projects list shows (or empty state)

**Status**: [ ] PASS [ ] FAIL

---

### Test 3.2: Create Project Modal

**Steps**:
1. Click "Create Project" button
2. Modal should open
3. Fill in project name
4. Click "Create"
5. Modal should close
6. New project should appear in list

**Expected**:
- [ ] Modal opens
- [ ] Form fields work
- [ ] Validation works
- [ ] Project created successfully
- [ ] List refreshes

**Status**: [ ] PASS [ ] FAIL

---

### Test 3.3: Project Board View

**URL**: `/projects/[id]`

**Steps**:
1. Click on a project card
2. Should navigate to project board
3. Should see Kanban columns (To Do, In Progress, Review, Done)
4. Should see "Add Task" buttons

**Expected**:
- [ ] Board loads
- [ ] 4 default columns visible
- [ ] Add task buttons work
- [ ] No console errors

**Status**: [ ] PASS [ ] FAIL

---

### Test 3.4: Create Task

**Steps**:
1. On project board, click "Add Task" in a column
2. Modal should open
3. Fill in task title
4. Click "Create"
5. Task should appear in column

**Expected**:
- [ ] Modal opens
- [ ] Form works
- [ ] Task created
- [ ] Task appears in correct column

**Status**: [ ] PASS [ ] FAIL

---

### Test 3.5: Drag & Drop Task

**Steps**:
1. Click and hold a task card
2. Drag to another column
3. Release
4. Task should move to new column

**Expected**:
- [ ] Task is draggable
- [ ] Visual feedback during drag
- [ ] Task moves to new column
- [ ] Position saved in database

**Status**: [ ] PASS [ ] FAIL

---

### Test 3.6: Task Details Modal

**Steps**:
1. Click on a task card
2. Modal should open with task details
3. Should show title, description, assignee, etc.
4. Should have edit and delete buttons

**Expected**:
- [ ] Modal opens
- [ ] All details displayed
- [ ] Edit button works
- [ ] Delete button works

**Status**: [ ] PASS [ ] FAIL

---

### Test 3.7: My Tasks Page (Employee)

**URL**: `/my-tasks`

**Steps**:
1. Login as employee
2. Navigate to `/my-tasks`
3. Should see tasks assigned to current user

**Expected**:
- [ ] Page loads
- [ ] Shows assigned tasks only
- [ ] Can click to view details
- [ ] Can update task status

**Status**: [ ] PASS [ ] FAIL

---

## Test Suite 4: Integration Tests

### Test 4.1: Full Workflow

**Scenario**: Create project → Add tasks → Move tasks → Complete tasks

**Steps**:
1. Create a new project "Sprint Planning"
2. Verify 4 default lists created
3. Create 3 tasks in "To Do" list
4. Move 1 task to "In Progress"
5. Move 1 task to "Done"
6. Add comment to a task
7. Assign task to another user

**Expected**: All operations succeed without errors

**Status**: [ ] PASS [ ] FAIL

---

### Test 4.2: Permissions Test

**Scenario**: Test role-based access

**Steps**:
1. Create project as admin
2. Add employee as "viewer"
3. Login as that employee
4. Try to edit project (should fail)
5. Try to create task (should fail)
6. Try to view project (should succeed)

**Expected**: Permissions enforced correctly

**Status**: [ ] PASS [ ] FAIL

---

### Test 4.3: Real-time Updates

**Scenario**: Multiple users working on same project

**Steps**:
1. Open project in two browser windows
2. Create task in window 1
3. Check if it appears in window 2 (after refresh)
4. Move task in window 2
5. Check if position updated in window 1 (after refresh)

**Expected**: Changes reflected across sessions

**Status**: [ ] PASS [ ] FAIL

---

## Test Suite 5: Error Handling

### Test 5.1: Unauthorized Access

**Steps**:
1. Logout
2. Try to access `/projects`
3. Should redirect to login

**Expected**: Redirected to login page

**Status**: [ ] PASS [ ] FAIL

---

### Test 5.2: Invalid Data

**Steps**:
1. Try to create project with empty name
2. Should show validation error

**Expected**: Error message displayed

**Status**: [ ] PASS [ ] FAIL

---

### Test 5.3: Network Error

**Steps**:
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to create project
4. Should show error message

**Expected**: User-friendly error message

**Status**: [ ] PASS [ ] FAIL

---

## Test Suite 6: Performance

### Test 6.1: Load Time

**Steps**:
1. Open DevTools → Network tab
2. Navigate to `/projects`
3. Check load time

**Expected**: Page loads in < 2 seconds

**Status**: [ ] PASS [ ] FAIL

---

### Test 6.2: Large Dataset

**Steps**:
1. Create project with 50+ tasks
2. Check if board loads smoothly
3. Try drag & drop

**Expected**: No lag or freezing

**Status**: [ ] PASS [ ] FAIL

---

## Common Issues & Solutions

### Issue: "Unauthorized" Error

**Symptoms**: API returns 401
**Solution**:
```javascript
// Check token
const token = localStorage.getItem('authToken')
console.log('Token:', token ? 'EXISTS' : 'MISSING')

// If missing, logout and login again
```

---

### Issue: "Internal Server Error" (500)

**Symptoms**: API returns 500
**Solution**:
1. Check server terminal for error logs
2. Verify database migration ran
3. Check RLS policies

---

### Issue: Tasks Not Showing

**Symptoms**: Empty board
**Solution**:
1. Check browser console for errors
2. Verify user is project member
3. Check API response in Network tab

---

### Issue: Drag & Drop Not Working

**Symptoms**: Can't drag tasks
**Solution**:
```bash
# Install dependency
npm install react-beautiful-dnd @types/react-beautiful-dnd

# Restart dev server
npm run dev
```

---

## Test Results Summary

| Test Suite | Tests | Passed | Failed | Notes |
|------------|-------|--------|--------|-------|
| Database   |   3   |        |        |       |
| API        |   5   |        |        |       |
| Frontend   |   7   |        |        |       |
| Integration|   3   |        |        |       |
| Errors     |   3   |        |        |       |
| Performance|   2   |        |        |       |
| **TOTAL**  | **23**|        |        |       |

---

## Sign-off

**Tested By**: _______________  
**Date**: _______________  
**Environment**: [ ] Local [ ] Staging [ ] Production  
**Overall Status**: [ ] PASS [ ] FAIL  

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________

---

## Next Steps After Testing

If all tests pass:
1. ✅ Deploy to production
2. ✅ Monitor logs for errors
3. ✅ Train users on new features
4. ✅ Create user documentation

If tests fail:
1. ❌ Document failing tests
2. ❌ Fix issues
3. ❌ Re-run tests
4. ❌ Repeat until all pass
