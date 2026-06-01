# 🏗️ Trello Technical Architecture

## How to Build Trello Without Breaking Attendance

This document explains the technical architecture and how everything fits together.

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR APPLICATION                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │   ATTENDANCE     │         │     PROJECTS     │        │
│  │     SYSTEM       │         │  (Trello Clone)  │        │
│  │   (Existing)     │         │      (New)       │        │
│  └──────────────────┘         └──────────────────┘        │
│          │                             │                    │
│          │                             │                    │
│  ┌───────▼──────────┐         ┌───────▼──────────┐        │
│  │ Attendance Pages │         │  Project Pages   │        │
│  │ /attendance      │         │  /projects       │        │
│  │ /leaves          │         │  /projects/[id]  │        │
│  │ /salary          │         │  /my-tasks       │        │
│  └──────────────────┘         └──────────────────┘        │
│          │                             │                    │
│          │                             │                    │
│  ┌───────▼──────────┐         ┌───────▼──────────┐        │
│  │ Attendance APIs  │         │   Project APIs   │        │
│  │ /api/attendance  │         │  /api/projects   │        │
│  │ /api/leaves      │         │  /api/tasks      │        │
│  └──────────────────┘         └──────────────────┘        │
│          │                             │                    │
│          └─────────────┬───────────────┘                    │
│                        │                                    │
│                ┌───────▼────────┐                          │
│                │  SUPABASE DB   │                          │
│                │                │                          │
│                │  auth.users ◄──┼─── Shared               │
│                │                │                          │
│                │  attendance ◄──┼─── Attendance Only       │
│                │  leaves     ◄──┤                          │
│                │  users      ◄──┤                          │
│                │                │                          │
│                │  projects   ◄──┼─── Projects Only         │
│                │  tasks      ◄──┤                          │
│                │  checklists ◄──┤                          │
│                └────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
src/
├── app/
│   ├── (admin)/                    # Admin routes
│   │   ├── dashboard/              # ✅ Attendance dashboard
│   │   ├── employees/              # ✅ Attendance employees
│   │   ├── reports/                # ✅ Attendance reports
│   │   ├── projects/               # 🆕 Projects dashboard
│   │   │   ├── page.tsx            # ✅ Projects list
│   │   │   └── [id]/
│   │   │       └── page.tsx        # 🆕 Project board (needs enhancement)
│   │   └── layout.tsx              # ✅ Shared admin layout
│   │
│   ├── (employee)/                 # Employee routes
│   │   ├── attendance/             # ✅ Mark attendance
│   │   ├── leaves/                 # ✅ Leave requests
│   │   ├── salary/                 # ✅ Salary info
│   │   ├── my-tasks/               # 🆕 Employee's tasks
│   │   │   └── page.tsx            # 🆕 Task list (needs enhancement)
│   │   └── layout.tsx              # ✅ Shared employee layout
│   │
│   └── api/
│       ├── attendance/             # ✅ Attendance APIs
│       ├── leaves/                 # ✅ Leave APIs
│       ├── projects/               # ✅ Project APIs (22 endpoints)
│       │   ├── route.ts            # ✅ GET/POST projects
│       │   └── [id]/
│       │       ├── route.ts        # ✅ GET/PUT/DELETE project
│       │       ├── lists/
│       │       │   └── route.ts    # ✅ GET/POST lists
│       │       └── members/
│       │           └── route.ts    # ✅ GET/POST members
│       ├── tasks/                  # ✅ Task APIs
│       │   ├── route.ts            # ✅ GET/POST tasks
│       │   ├── [id]/
│       │   │   ├── route.ts        # ✅ GET/PUT/DELETE task
│       │   │   ├── comments/
│       │   │   │   └── route.ts    # ✅ GET/POST comments
│       │   │   └── checklists/     # 🆕 Checklist APIs (needs creation)
│       │   │       └── route.ts    # 🆕 GET/POST checklists
│       │   └── move/
│       │       └── route.ts        # ✅ POST move task
│       ├── lists/                  # ✅ List APIs
│       └── labels/                 # ✅ Label APIs
│
├── components/
│   ├── layout/                     # ✅ Shared layouts
│   │   ├── Sidebar.tsx             # ✅ Navigation (needs project links)
│   │   ├── Header.tsx              # ✅ Top bar
│   │   └── PageWrapper.tsx         # ✅ Page container
│   │
│   ├── attendance/                 # ✅ Attendance components
│   │   └── ...                     # ✅ Don't touch these!
│   │
│   ├── projects/                   # 🆕 Project components
│   │   ├── ProjectCard.tsx         # ✅ Project card
│   │   └── CreateProjectModal.tsx  # ✅ Create project modal
│   │
│   ├── kanban/                     # 🆕 Kanban board components
│   │   ├── KanbanBoard.tsx         # 🆕 Main board (needs creation)
│   │   ├── KanbanList.tsx          # 🆕 List column (needs creation)
│   │   └── TaskCard.tsx            # 🆕 Task card (needs creation)
│   │
│   └── tasks/                      # 🆕 Task detail components
│       ├── TaskDetailModal.tsx     # 🆕 Card modal (needs creation)
│       ├── TaskDescription.tsx     # 🆕 Description editor
│       ├── ChecklistComponent.tsx  # 🆕 Checklist
│       ├── MemberPicker.tsx        # 🆕 Member selector
│       ├── LabelPicker.tsx         # 🆕 Label selector
│       ├── DueDatePicker.tsx       # 🆕 Date picker
│       ├── AttachmentUploader.tsx  # 🆕 File upload
│       ├── CommentSection.tsx      # 🆕 Comments
│       └── ActivityFeed.tsx        # 🆕 Activity log
│
├── lib/
│   ├── supabase-server.ts          # ✅ Service role client
│   ├── supabase-user-client.ts     # ✅ User auth client
│   └── supabase-auth-helper.ts     # ✅ Auth helpers
│
└── types/
    ├── attendance.types.ts         # ✅ Attendance types
    └── project.types.ts            # ✅ Project types

Legend:
✅ = Already exists and working
🆕 = Needs to be created
```

---

## 🗄️ Database Architecture

### Existing Tables (Don't Touch!)
```sql
-- Attendance System Tables
- attendance
- leaves
- users
- holidays
- salary_records
- etc.
```

### Project Management Tables (Already Created!)
```sql
-- Core Tables
✅ projects              -- Boards
✅ project_lists         -- Lists/Columns
✅ tasks                 -- Cards
✅ task_labels           -- Labels
✅ task_label_assignments -- Card-Label mapping
✅ task_comments         -- Comments
✅ task_attachments      -- File uploads
✅ project_members       -- Access control
✅ task_activities       -- Activity log
✅ project_settings      -- Project config

-- New Tables Needed
🆕 task_checklists       -- Checklists
🆕 checklist_items       -- Checklist items
```

### Shared Tables
```sql
-- Used by both systems
✅ auth.users            -- User authentication
```

### Table Relationships
```
auth.users
    ├── projects (created_by, workspace_owner_id)
    ├── project_members (user_id)
    ├── tasks (assigned_to, created_by)
    ├── task_comments (user_id)
    └── task_attachments (uploaded_by)

projects
    ├── project_lists (project_id)
    ├── tasks (project_id)
    ├── task_labels (project_id)
    ├── project_members (project_id)
    └── project_settings (project_id)

project_lists
    └── tasks (list_id)

tasks
    ├── task_label_assignments (task_id)
    ├── task_comments (task_id)
    ├── task_attachments (task_id)
    ├── task_activities (task_id)
    └── task_checklists (task_id) 🆕

task_checklists 🆕
    └── checklist_items (checklist_id) 🆕
```

---

## 🔌 API Architecture

### Existing Attendance APIs (Don't Touch!)
```
GET  /api/attendance          # List attendance
POST /api/attendance/mark     # Mark attendance
GET  /api/leaves              # List leaves
POST /api/leaves              # Request leave
...
```

### Project Management APIs (Already Created!)
```
# Projects
✅ GET    /api/projects                    # List projects
✅ POST   /api/projects                    # Create project
✅ GET    /api/projects/[id]               # Get project
✅ PUT    /api/projects/[id]               # Update project
✅ DELETE /api/projects/[id]               # Delete project
✅ GET    /api/projects/[id]/lists         # Get lists
✅ POST   /api/projects/[id]/lists         # Create list
✅ GET    /api/projects/[id]/members       # Get members
✅ POST   /api/projects/[id]/members       # Add member

# Tasks
✅ GET    /api/tasks                       # List tasks (with filters)
✅ POST   /api/tasks                       # Create task
✅ GET    /api/tasks/[id]                  # Get task
✅ PUT    /api/tasks/[id]                  # Update task
✅ DELETE /api/tasks/[id]                  # Delete task
✅ POST   /api/tasks/move                  # Move task (drag & drop)
✅ GET    /api/tasks/[id]/comments         # Get comments
✅ POST   /api/tasks/[id]/comments         # Add comment

# Lists
✅ GET    /api/lists/[id]                  # Get list
✅ PUT    /api/lists/[id]                  # Update list
✅ DELETE /api/lists/[id]                  # Delete list

# Labels
✅ GET    /api/labels?project_id=xxx       # Get labels
✅ POST   /api/labels                      # Create label
```

### New APIs Needed
```
# Checklists
🆕 GET    /api/tasks/[id]/checklists       # Get checklists
🆕 POST   /api/tasks/[id]/checklists       # Create checklist
🆕 PUT    /api/checklists/[id]             # Update checklist
🆕 DELETE /api/checklists/[id]             # Delete checklist
🆕 POST   /api/checklists/[id]/items       # Add item
🆕 PUT    /api/checklist-items/[id]        # Update item
🆕 DELETE /api/checklist-items/[id]        # Delete item

# Card Covers
🆕 PUT    /api/tasks/[id]/cover            # Set cover
🆕 DELETE /api/tasks/[id]/cover            # Remove cover

# Search
🆕 GET    /api/search?q=query              # Search cards

# Activities
🆕 GET    /api/tasks/[id]/activities       # Get task activities
🆕 GET    /api/projects/[id]/activities    # Get project activities
```

---

## 🎨 Component Architecture

### Layout Components (Shared)
```tsx
// Already exists - just add project links
<Sidebar>
  <AdminNav>
    <Link href="/dashboard">Dashboard</Link>
    <Link href="/employees">Employees</Link>
    <Link href="/projects">Projects</Link> {/* 🆕 Add this */}
  </AdminNav>
  <EmployeeNav>
    <Link href="/attendance">Attendance</Link>
    <Link href="/leaves">Leaves</Link>
    <Link href="/my-tasks">My Tasks</Link> {/* 🆕 Add this */}
  </EmployeeNav>
</Sidebar>
```

### Project Board Page
```tsx
// /projects/[id]/page.tsx
<PageWrapper>
  <BoardHeader />
  <KanbanBoard>
    <KanbanList name="To Do">
      <TaskCard onClick={openModal} />
      <TaskCard onClick={openModal} />
    </KanbanList>
    <KanbanList name="In Progress">
      <TaskCard onClick={openModal} />
    </KanbanList>
    <KanbanList name="Done">
      <TaskCard onClick={openModal} />
    </KanbanList>
  </KanbanBoard>
  
  {/* Modal opens when card clicked */}
  <TaskDetailModal
    isOpen={modalOpen}
    task={selectedTask}
    onClose={closeModal}
  />
</PageWrapper>
```

### Task Detail Modal Structure
```tsx
<TaskDetailModal>
  {/* Cover */}
  {task.cover && <CardCover />}
  
  <div className="flex">
    {/* Left: Card Details (70%) */}
    <div className="flex-1">
      <TaskDetailHeader />
      <TaskMeta>
        <MembersList />
        <LabelsList />
        <DueDateBadge />
      </TaskMeta>
      <TaskDescription />
      <ChecklistSection>
        <Checklist />
        <Checklist />
      </ChecklistSection>
      <AttachmentSection />
      <CommentSection />
      <ActivityFeed />
    </div>
    
    {/* Right: Actions Sidebar (30%) */}
    <div className="w-64">
      <ActionsSidebar>
        <AddMembersButton />
        <AddLabelsButton />
        <SetDueDateButton />
        <AddChecklistButton />
        <AddAttachmentButton />
        <MoveCardButton />
        <CopyCardButton />
        <ArchiveCardButton />
      </ActionsSidebar>
    </div>
  </div>
</TaskDetailModal>
```

---

## 🔐 Authentication & Authorization

### How It Works
```
1. User logs in → Gets JWT token from Supabase
2. Token stored in localStorage
3. Every API call includes: Authorization: Bearer <token>
4. API verifies token with Supabase
5. RLS policies check user permissions
6. Data returned only if user has access
```

### RLS Policy Pattern
```sql
-- Example: Users can only see projects they're members of
CREATE POLICY "Users can view their projects" ON projects
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = projects.id 
      AND status = 'active'
    )
  );
```

### No Conflicts with Attendance
- Attendance uses same auth system
- Different tables = different RLS policies
- No overlap = no conflicts

---

## 🎯 Data Flow Examples

### Example 1: Creating a Task
```
1. User clicks "Add Card" in UI
   └─> CreateTaskModal opens

2. User fills form and clicks "Create"
   └─> POST /api/tasks
       Body: { title, description, list_id, project_id }
       Headers: { Authorization: Bearer <token> }

3. API verifies token
   └─> getUserFromToken(token)

4. API checks permissions
   └─> RLS policy: Is user a project member?

5. API creates task
   └─> INSERT INTO tasks (...)

6. API logs activity
   └─> INSERT INTO task_activities (action: 'created')

7. API returns task
   └─> Response: { task: {...} }

8. UI updates
   └─> Task appears in list
```

### Example 2: Dragging a Card
```
1. User drags card from "To Do" to "In Progress"
   └─> onDragEnd event fires

2. UI optimistically updates
   └─> Card moves visually

3. API call
   └─> POST /api/tasks/move
       Body: {
         task_id,
         source_list_id: "todo",
         destination_list_id: "in_progress",
         destination_position: 2
       }

4. API updates task
   └─> UPDATE tasks 
       SET list_id = 'in_progress', position = 2

5. API reorders other tasks
   └─> UPDATE tasks 
       SET position = position + 1
       WHERE list_id = 'in_progress' AND position >= 2

6. API logs activity
   └─> INSERT INTO task_activities (action: 'moved')

7. If API fails
   └─> UI reverts to original position
```

### Example 3: Opening Card Modal
```
1. User clicks card
   └─> onClick handler fires

2. Fetch full card details
   └─> GET /api/tasks/[id]
       Includes: task, labels, members, comments, attachments, checklists

3. Modal opens with data
   └─> TaskDetailModal renders

4. User edits description
   └─> PUT /api/tasks/[id]
       Body: { description: "new text" }

5. Modal updates
   └─> Description shows new text

6. User adds checklist
   └─> POST /api/tasks/[id]/checklists
       Body: { title: "Todo" }

7. Checklist appears
   └─> ChecklistComponent renders

8. User closes modal
   └─> Board refreshes to show changes
```

---

## 📦 Required Libraries

### Already Installed
```json
{
  "next": "^14.x",
  "react": "^18.x",
  "tailwindcss": "^3.x",
  "@supabase/supabase-js": "^2.x",
  "lucide-react": "^0.x"
}
```

### Need to Install
```bash
# Drag & Drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Rich Text Editor
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder

# Date Picker
npm install react-datepicker
npm install -D @types/react-datepicker

# File Upload
npm install react-dropzone

# Utilities
npm install clsx date-fns
```

---

## 🚀 Deployment Strategy

### Development
```bash
# 1. Create feature branch
git checkout -b feature/trello-integration

# 2. Make changes
# ... build components ...

# 3. Test locally
npm run dev

# 4. Commit frequently
git add .
git commit -m "Add task detail modal"

# 5. Push to branch
git push origin feature/trello-integration
```

### Testing Checklist
```
Before merging to main:

Attendance System:
□ Can mark attendance
□ Can request leave
□ Can view salary
□ All attendance features work

Project System:
□ Can create project
□ Can create lists
□ Can create tasks
□ Can drag tasks
□ Can open task modal
□ Can add checklists
□ Can add comments
□ Can upload attachments

Integration:
□ Both systems work independently
□ No conflicts
□ No broken links
□ No console errors
```

### Production Deployment
```bash
# 1. Merge to main
git checkout main
git merge feature/trello-integration

# 2. Run database migrations
# Execute SQL in Supabase dashboard

# 3. Deploy to Vercel/hosting
git push origin main

# 4. Verify production
# Test all features in production
```

---

## 🔧 Troubleshooting

### Common Issues

#### Issue 1: "Unauthorized" Error
```
Problem: API returns 401
Cause: Token missing or invalid
Solution:
1. Check localStorage has authToken
2. Check token is sent in headers
3. Check token hasn't expired
4. Re-login if needed
```

#### Issue 2: "500 Internal Server Error"
```
Problem: API returns 500
Cause: Database query error or RLS policy blocking
Solution:
1. Check server logs in terminal
2. Check RLS policies in Supabase
3. Check user is project member
4. Check SQL query syntax
```

#### Issue 3: Drag & Drop Not Working
```
Problem: Can't drag cards
Cause: DnD library not installed or configured
Solution:
1. npm install @dnd-kit/core @dnd-kit/sortable
2. Check DndContext wraps board
3. Check useSortable hook used correctly
4. Check onDragEnd handler exists
```

#### Issue 4: Modal Not Opening
```
Problem: Click card, nothing happens
Cause: onClick handler not connected or modal state not managed
Solution:
1. Check onClick={openModal} on TaskCard
2. Check useState for modal state
3. Check TaskDetailModal receives isOpen prop
4. Check z-index of modal (should be high)
```

---

## 📊 Performance Considerations

### Optimization Strategies

#### 1. Lazy Loading
```tsx
// Load modal only when needed
const TaskDetailModal = lazy(() => import('./TaskDetailModal'))

// Load board only on project page
const KanbanBoard = lazy(() => import('./KanbanBoard'))
```

#### 2. Pagination
```tsx
// Load tasks in batches
const { data, hasMore } = useTasks({
  project_id,
  limit: 50,
  offset: page * 50
})
```

#### 3. Optimistic Updates
```tsx
// Update UI immediately, sync with server later
const moveTask = async (taskId, newListId) => {
  // 1. Update UI
  setTasks(optimisticallyMovedTasks)
  
  // 2. Call API
  try {
    await api.tasks.move(taskId, newListId)
  } catch (error) {
    // 3. Revert on error
    setTasks(originalTasks)
  }
}
```

#### 4. Caching
```tsx
// Cache project data
const { data: project } = useQuery(
  ['project', projectId],
  () => api.projects.get(projectId),
  { staleTime: 5 * 60 * 1000 } // 5 minutes
)
```

---

## 🎯 Success Metrics

### How to Know It's Working

#### Backend
- ✅ All API endpoints return 200
- ✅ RLS policies allow correct access
- ✅ Database queries are fast (<100ms)
- ✅ No console errors

#### Frontend
- ✅ Drag & drop is smooth
- ✅ Modal opens instantly
- ✅ No layout shifts
- ✅ Loading states show
- ✅ Errors are handled gracefully

#### User Experience
- ✅ Feels like Trello
- ✅ Intuitive to use
- ✅ Fast and responsive
- ✅ No bugs

#### Integration
- ✅ Attendance system unaffected
- ✅ Both systems work together
- ✅ Shared navigation works
- ✅ No conflicts

---

## 📞 Next Steps

Now that you understand the architecture, you can:

1. **Start with Database** - Add checklist tables
2. **Build Components** - Create modal and board
3. **Test Integration** - Verify no conflicts
4. **Deploy** - Push to production

Which part would you like to implement first?

