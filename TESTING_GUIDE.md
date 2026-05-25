# 🧪 Kan Project Management - Testing Guide

## Pre-Testing Checklist

Before we start testing, ensure these steps are completed:

### 1. Database Migration
- [ ] Run `KAN_PROJECT_MANAGEMENT_MIGRATION.sql` in Supabase SQL Editor
- [ ] Verify all 10 tables were created
- [ ] Check that storage bucket `task-attachments` exists

### 2. Initial Data Setup
- [ ] Run `node setup-project-management.js`
- [ ] Verify sample project was created
- [ ] Check that default lists exist (To Do, In Progress, Review, Done)
- [ ] Confirm default labels were created

### 3. Development Server
- [ ] Server is running on `http://localhost:3000`
- [ ] No compilation errors
- [ ] All dependencies installed

---

## Testing Steps

### Phase 1: Admin - Projects Dashboard

#### Test 1.1: Access Projects Page
1. Log in as admin
2. Click **"Projects"** in the sidebar
3. **Expected**: Projects dashboard loads with sample project

**✅ Success Criteria:**
- Page loads without errors
- Sample project card is visible
- Stats show correct numbers (1 project, tasks count, lists count)
- "New Project" button is visible

#### Test 1.2: Create New Project
1. Click **"New Project"** button
2. Fill in project details:
   - Name: "Test Project"
   - Description: "Testing project management"
   - Select a color (e.g., Purple)
3. Click **"Create Project"**

**✅ Success Criteria:**
- Modal opens smoothly
- Form validation works (try submitting empty form)
- Success message appears
- Redirects to new project board
- New project appears in projects list

#### Test 1.3: View Project Card
1. Return to `/projects`
2. Observe project card details

**✅ Success Criteria:**
- Project name and description visible
- Color bar at top matches selected color
- Task count shows correctly
- Progress bar displays
- Status breakdown (To Do, In Progress, Done) shows
- Created date displays

---

### Phase 2: Admin - Project Board

#### Test 2.1: Open Project Board
1. Click on a project card
2. Wait for board to load

**✅ Success Criteria:**
- Navigates to `/projects/[id]`
- Project name in header with color indicator
- Back arrow works
- 4 default lists visible (To Do, In Progress, Review, Done)
- Stats cards show correct numbers
- Kanban board renders properly

#### Test 2.2: Create New Task
1. Click **"Add task"** button in any list
2. Fill in task details:
   - Title: "Test Task 1"
   - Description: "Testing task creation"
   - Priority: High
   - Due Date: Tomorrow
3. Click **"Create Task"**

**✅ Success Criteria:**
- Modal opens
- Form validation works
- Task appears in the correct list
- Task card shows priority badge
- Due date displays correctly
- Stats update automatically

#### Test 2.3: Drag and Drop Task
1. Drag a task from one list to another
2. Drop it in a different position

**✅ Success Criteria:**
- Task moves smoothly
- "Moving task..." indicator appears
- Task stays in new position after refresh
- No errors in console
- Other tasks adjust positions

#### Test 2.4: View Task Details
1. Click on a task card
2. View task modal

**✅ Success Criteria:**
- Modal opens with full task details
- All fields display correctly (title, description, priority, due date, completion)
- Created date and creator shown
- "Edit Task" button visible

#### Test 2.5: Edit Task
1. In task modal, click **"Edit Task"**
2. Modify fields:
   - Change title
   - Update description
   - Change priority
   - Adjust completion percentage
3. Click **"Save Changes"**

**✅ Success Criteria:**
- Edit mode activates
- All fields become editable
- Changes save successfully
- Modal updates with new data
- Board refreshes with updated task

---

### Phase 3: Employee - My Tasks

#### Test 3.1: Access My Tasks Page
1. Log in as employee (or use admin account)
2. Click **"My Tasks"** in sidebar

**✅ Success Criteria:**
- Page loads without errors
- Stats cards show correct numbers
- Filter and search bar visible
- Tasks grouped by status

#### Test 3.2: Assign Task to User
1. As admin, go to a project board
2. Create or edit a task
3. Assign it to yourself or an employee
4. Save the task

**✅ Success Criteria:**
- Task shows assigned user avatar
- Task appears in "My Tasks" for that user

#### Test 3.3: Filter Tasks
1. Go to `/my-tasks`
2. Test status filter:
   - Select "To Do"
   - Select "In Progress"
   - Select "Done"
3. Test priority filter:
   - Select "High"
   - Select "Urgent"

**✅ Success Criteria:**
- Tasks filter correctly
- Stats update based on filters
- Empty state shows when no tasks match

#### Test 3.4: Search Tasks
1. Type in search box: "Test"
2. Try searching for project name
3. Clear search

**✅ Success Criteria:**
- Tasks filter as you type
- Search works for title, description, and project name
- Results update immediately

#### Test 3.5: View Task from My Tasks
1. Click on a task card
2. View and edit task

**✅ Success Criteria:**
- Task modal opens
- Can view all details
- Can edit task (if permissions allow)
- Changes reflect in My Tasks list

---

### Phase 4: Navigation & UI

#### Test 4.1: Sidebar Navigation
1. Test all navigation links:
   - Dashboard → Projects → Project Board
   - My Tasks
   - Back to Dashboard

**✅ Success Criteria:**
- All links work
- Active state highlights current page
- Mobile menu works (test on small screen)
- Icons display correctly

#### Test 4.2: Responsive Design
1. Resize browser window
2. Test on mobile size (< 768px)
3. Test on tablet size (768px - 1023px)

**✅ Success Criteria:**
- Layout adjusts properly
- Sidebar collapses on mobile
- Cards stack vertically
- Kanban board scrolls horizontally
- Touch interactions work

#### Test 4.3: Loading States
1. Refresh pages and observe loading states
2. Create/edit tasks and observe spinners

**✅ Success Criteria:**
- Loading spinners appear
- Buttons disable during operations
- "Loading..." text shows
- No layout shift when content loads

---

### Phase 5: Error Handling

#### Test 5.1: Authentication
1. Clear localStorage
2. Try to access `/projects`

**✅ Success Criteria:**
- Redirects to `/login`
- No errors in console

#### Test 5.2: Invalid Project ID
1. Navigate to `/projects/invalid-id`

**✅ Success Criteria:**
- Shows "Project not found" message
- Provides link back to projects
- No crashes

#### Test 5.3: Network Errors
1. Turn off internet (or pause in DevTools)
2. Try to create a task

**✅ Success Criteria:**
- Error message displays
- User-friendly alert
- Can retry after reconnecting

---

### Phase 6: Data Persistence

#### Test 6.1: Refresh Persistence
1. Create a project
2. Refresh the page
3. Check if project still exists

**✅ Success Criteria:**
- Data persists after refresh
- No data loss

#### Test 6.2: Task Position Persistence
1. Drag tasks to new positions
2. Refresh the page

**✅ Success Criteria:**
- Tasks stay in new positions
- Order is maintained

#### Test 6.3: Cross-Tab Sync
1. Open project in two browser tabs
2. Create task in one tab
3. Refresh other tab

**✅ Success Criteria:**
- Changes appear after refresh
- No conflicts

---

## Common Issues & Solutions

### Issue 1: "No auth token found"
**Solution:** 
- Make sure you're logged in
- Check localStorage has `authToken`
- Try logging out and back in

### Issue 2: "Project not found or access denied"
**Solution:**
- Verify project exists in database
- Check user is a project member
- Run setup script again

### Issue 3: Drag and drop not working
**Solution:**
- Check browser console for errors
- Verify @hello-pangea/dnd is installed
- Try refreshing the page

### Issue 4: Tasks not appearing
**Solution:**
- Check API response in Network tab
- Verify tasks exist in database
- Check RLS policies in Supabase

### Issue 5: Styles not loading
**Solution:**
- Verify Tailwind CSS is configured
- Check for CSS conflicts
- Clear browser cache

---

## Database Verification Queries

Run these in Supabase SQL Editor to verify data:

```sql
-- Check projects
SELECT * FROM projects;

-- Check lists
SELECT * FROM project_lists ORDER BY position;

-- Check tasks
SELECT * FROM tasks ORDER BY created_at DESC;

-- Check project members
SELECT * FROM project_members;

-- Check labels
SELECT * FROM task_labels;

-- Verify RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename LIKE '%project%' OR tablename LIKE '%task%';
```

---

## Performance Checks

### Page Load Times
- [ ] Projects dashboard: < 2 seconds
- [ ] Project board: < 3 seconds
- [ ] My tasks: < 2 seconds

### API Response Times
- [ ] GET /api/projects: < 500ms
- [ ] GET /api/projects/[id]: < 1s
- [ ] POST /api/tasks: < 500ms
- [ ] POST /api/tasks/move: < 500ms

### UI Responsiveness
- [ ] Drag and drop: Smooth, no lag
- [ ] Modal open/close: Instant
- [ ] Filter/search: Real-time updates

---

## Browser Compatibility

Test in these browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Accessibility Checks

- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Screen reader friendly
- [ ] Color contrast sufficient
- [ ] Alt text on images/icons

---

## Final Checklist

### Functionality
- [ ] All pages load without errors
- [ ] All CRUD operations work
- [ ] Drag and drop works
- [ ] Filters and search work
- [ ] Authentication works
- [ ] Navigation works

### UI/UX
- [ ] Design matches existing pages
- [ ] Responsive on all devices
- [ ] Loading states show
- [ ] Error messages clear
- [ ] Empty states helpful

### Performance
- [ ] Pages load quickly
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] No console errors

### Data
- [ ] Data persists correctly
- [ ] No data loss
- [ ] RLS policies work
- [ ] Relationships intact

---

## Test Results Template

```
Date: ___________
Tester: ___________

Phase 1: Projects Dashboard
- Test 1.1: ☐ Pass ☐ Fail
- Test 1.2: ☐ Pass ☐ Fail
- Test 1.3: ☐ Pass ☐ Fail

Phase 2: Project Board
- Test 2.1: ☐ Pass ☐ Fail
- Test 2.2: ☐ Pass ☐ Fail
- Test 2.3: ☐ Pass ☐ Fail
- Test 2.4: ☐ Pass ☐ Fail
- Test 2.5: ☐ Pass ☐ Fail

Phase 3: My Tasks
- Test 3.1: ☐ Pass ☐ Fail
- Test 3.2: ☐ Pass ☐ Fail
- Test 3.3: ☐ Pass ☐ Fail
- Test 3.4: ☐ Pass ☐ Fail
- Test 3.5: ☐ Pass ☐ Fail

Phase 4: Navigation & UI
- Test 4.1: ☐ Pass ☐ Fail
- Test 4.2: ☐ Pass ☐ Fail
- Test 4.3: ☐ Pass ☐ Fail

Phase 5: Error Handling
- Test 5.1: ☐ Pass ☐ Fail
- Test 5.2: ☐ Pass ☐ Fail
- Test 5.3: ☐ Pass ☐ Fail

Phase 6: Data Persistence
- Test 6.1: ☐ Pass ☐ Fail
- Test 6.2: ☐ Pass ☐ Fail
- Test 6.3: ☐ Pass ☐ Fail

Overall Status: ☐ All Pass ☐ Some Failures

Notes:
_________________________________
_________________________________
_________________________________
```

---

## Next Steps After Testing

1. **If all tests pass:**
   - Deploy to production
   - Train users
   - Monitor for issues

2. **If tests fail:**
   - Document issues
   - Fix bugs
   - Re-test
   - Repeat until all pass

3. **Optional enhancements:**
   - Add more features
   - Improve performance
   - Add analytics
   - Enhance UI/UX

---

**Happy Testing! 🧪**