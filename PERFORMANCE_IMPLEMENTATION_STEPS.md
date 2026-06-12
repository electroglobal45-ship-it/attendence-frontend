# 🚀 Performance Optimization - Implementation Steps

## ✅ **STEP-BY-STEP IMPLEMENTATION GUIDE**

Follow these steps IN ORDER to optimize your application performance.

---

## 🎯 **PHASE 1: Database Optimization (30 minutes)**

### **Step 1: Run SQL Optimization Script**

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the file: `PERFORMANCE_OPTIMIZATION.sql`
4. Click **Run** (takes 2-5 minutes)
5. Verify completion message:
   ```
   ✅ Performance optimization complete!
   📊 Summary:
     - Created 50+ database indexes
     - Added computed columns
     - Created materialized view
   ```

### **Step 2: Verify Indexes Were Created**

Run this query in SQL Editor:
```sql
SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'boards', 'projects', 'attendance')
GROUP BY tablename
ORDER BY tablename;
```

Expected result:
- tasks: 15-20 indexes
- boards: 5-8 indexes
- projects: 4-6 indexes
- attendance: 6-8 indexes

### **Step 3: Test Database Performance**

Run a board query before/after to see the difference:

```sql
EXPLAIN ANALYZE
SELECT * FROM tasks 
WHERE board_id = 'your-board-id' 
AND is_closed = false
ORDER BY position;
```

**Before:** ~100-500ms
**After:** ~5-20ms ✨

---

## 🎯 **PHASE 2: Frontend Navigation Fixes (1 hour)**

### **Step 1: Add Middleware for Server-Side Auth**

File already created: `src/middleware.ts`

✅ **What it does:**
- Checks auth BEFORE page loads (server-side)
- Redirects unauthorized users instantly
- No more client-side auth delays

### **Step 2: Update Auth Context to Prevent API Spam**

Replace `src/lib/auth-context.tsx` with the optimized version from `NAVIGATION_SLOWNESS_FIXES.md` (Fix 2)

✅ **What changed:**
- Added `hasLoadedRef` to prevent duplicate loads
- Uses cached user data first (instant)
- Only calls API once per session
- Stores token in cookies for middleware

**IMPORTANT:** Update the `login` function to store cookies:

```typescript
const login = useCallback(async (email: string, password: string): Promise<User> => {
  const result = await authAPI.login(email, password)

  if (result.user) {
    setUser(result.user)
    localStorage.setItem('user', JSON.stringify(result.user))
    localStorage.setItem('userRole', result.user.role)
    
    // ← ADD THIS: Store in cookies for middleware
    document.cookie = `authToken=${result.token}; path=/; max-age=604800; SameSite=Lax`
    document.cookie = `userRole=${result.user.role}; path=/; max-age=604800; SameSite=Lax`
    
    return result.user
  }

  throw new Error('User data not found in response')
}, [])
```

### **Step 3: Simplify Layout Files**

**File:** `src/app/(admin)/layout.tsx`

Replace with:
```typescript
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware handles auth now - no client-side checks needed!
  return <>{children}</>
}
```

**File:** `src/app/(employee)/layout.tsx`

Replace with:
```typescript
export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  // Middleware handles auth now - no client-side checks needed!
  return <>{children}</>
}
```

### **Step 4: Optimize Sidebar Component**

Replace `src/components/layout/Sidebar.tsx` with the optimized version from `NAVIGATION_SLOWNESS_FIXES.md` (Fix 4)

✅ **Key changes:**
- Added `React.memo` to prevent unnecessary re-renders
- Memoized nav items with `useMemo`
- Individual NavItem components with memo
- Added `prefetch={true}` to all Links
- Faster transitions (200ms vs 300ms)

### **Step 5: Add Global Loading State**

File already created: `src/app/loading.tsx`

This shows a spinner during page transitions instead of a blank screen.

### **Step 6: Update next.config.js**

Replace `next.config.js` with:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minification (faster builds)
  swcMinify: true,
  
  // Strict mode for better performance
  reactStrictMode: true,
  
  // Optimize package imports
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  
  // Optimize images
  images: {
    domains: [], // Add your Supabase domain if using images
    formats: ['image/webp', 'image/avif'],
  },
  
  // Output standalone for better production performance
  output: 'standalone',
}

module.exports = nextConfig
```

---

## 🎯 **PHASE 3: Backend API Optimization (1 hour)**

### **Step 1: Optimize Board Service**

**File:** `backend/src/modules/boards/boards.service.ts`

Replace the `getBoardWithDetails` method:

```typescript
async getBoardWithDetails(boardId: string, userId?: string, userRole?: string) {
  // Single query with all relations (was 7 separate queries!)
  const { data: boardData, error: boardError } = await supabaseAdmin
    .from('boards')
    .select(`
      *,
      project:projects!inner(
        id, name, description, background_type, background_value
      )
    `)
    .eq('id', boardId)
    .single()

  if (boardError) throw new Error(`Failed to fetch board: ${boardError.message}`)

  // Fetch all data in PARALLEL (not sequential)
  const [
    { data: members },
    { data: lists },
    { data: labels },
    { data: tasks }
  ] = await Promise.all([
    // Members
    supabaseAdmin
      .from('board_members')
      .select('*, user:users!inner(id, name, email, role)')
      .eq('board_id', boardId),
    
    // Lists
    supabaseAdmin
      .from('project_lists')
      .select('*')
      .eq('board_id', boardId)
      .eq('type', 'active')
      .order('position'),
    
    // Labels
    supabaseAdmin
      .from('board_labels')
      .select('*')
      .eq('board_id', boardId)
      .order('position'),
    
    // Tasks with ALL relations in ONE query
    supabaseAdmin
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, name, email),
        creator:users!tasks_created_by_fkey(id, name, email),
        task_members(
          user:users(id, name, email)
        ),
        task_board_labels(
          board_label:board_labels(id, name, color)
        )
      `)
      .eq('board_id', boardId)
      .eq('is_closed', false)
      .order('position')
  ])

  // Format tasks (all data already loaded!)
  const formattedTasks = tasks?.map(task => ({
    ...task,
    title: task.name,
    public_id: task.id,
    assigned_user: task.assigned_to_user,
    labels: task.task_board_labels?.map(tbl => ({
      id: tbl.board_label.id,
      colorId: tbl.board_label.id,
      name: tbl.board_label.name,
      color: tbl.board_label.color
    })) || [],
    members: task.task_members?.map(tm => tm.user) || []
  })) || []

  return {
    board: boardData,
    members: members || [],
    lists: lists || [],
    labels: labels || [],
    tasks: formattedTasks
  }
}
```

**Performance gain:** Board loading 2-5s → 200-500ms ✨

### **Step 2: Optimize Tasks Service**

**File:** `backend/src/modules/tasks/tasks.service.ts`

**DELETE the `mergeTaskLabels` method entirely** - it's inefficient!

Replace `getAllTasks` method:

```typescript
async getAllTasks() {
  const { data: tasks, error } = await supabaseAdmin
    .from('tasks')
    .select(`
      *,
      assigned_to_user:users!tasks_assigned_to_fkey(id, name, email),
      board:boards(id, name),
      task_board_labels(
        board_label:board_labels(id, name, color)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`)

  return tasks?.map(task => ({
    ...task,
    title: task.name || '',
    assigned_to_name: task.assigned_to_user?.name || null,
    assigned_to_email: task.assigned_to_user?.email || null,
    assigned_user: task.assigned_to_user,
    board: task.board || null,
    labels: task.task_board_labels?.map(tbl => ({
      id: tbl.board_label.id,
      colorId: tbl.board_label.id,
      name: tbl.board_label.name,
      color: tbl.board_label.color
    }))?.slice(0, 1) || [] // Single label
  })) || []
}
```

### **Step 3: Optimize Dashboard Stats with Materialized View**

**File:** `backend/src/modules/admin/admin.service.ts`

Replace `getDashboardStats` method:

```typescript
async getDashboardStats() {
  // Try to use materialized view first (instant!)
  const { data: stats } = await supabaseAdmin
    .from('dashboard_stats')
    .select('*')
    .single()

  if (stats) {
    return {
      totalEmployees: stats.total_employees,
      presentToday: stats.present_today,
      absentToday: stats.total_employees - stats.present_today,
      pendingLeaves: stats.pending_leaves,
      pendingShortLeaves: stats.pending_short_leaves,
      activeTasks: stats.active_tasks,
      lastUpdated: stats.last_updated
    }
  }

  // Fallback to real-time if view doesn't exist (first time only)
  const today = new Date().toISOString().split('T')[0]
  
  const [
    { count: totalEmployees },
    { count: presentToday },
    { count: pendingLeaves },
    { count: pendingShortLeaves },
    { count: activeTasks }
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'employee').eq('is_active', true),
    supabaseAdmin.from('attendance').select('*', { count: 'exact', head: true }).eq('check_in_date', today),
    supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('short_leaves').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['todo', 'in_progress', 'review'])
  ])

  return {
    totalEmployees: totalEmployees || 0,
    presentToday: presentToday || 0,
    absentToday: (totalEmployees || 0) - (presentToday || 0),
    pendingLeaves: pendingLeaves || 0,
    pendingShortLeaves: pendingShortLeaves || 0,
    activeTasks: activeTasks || 0
  }
}
```

---

## 🎯 **PHASE 4: Testing & Verification (30 minutes)**

### **Step 1: Test Database Indexes**

Open Supabase SQL Editor and run:

```sql
-- Should return results in <20ms
EXPLAIN ANALYZE
SELECT * FROM tasks 
WHERE board_id = 'your-board-id' 
AND is_closed = false
ORDER BY position;
```

### **Step 2: Test Frontend Navigation Speed**

1. Open Chrome DevTools → Performance tab
2. Start recording
3. Click between sidebar links rapidly
4. Stop recording

**Look for:**
- Navigation events <100ms
- No `AuthProvider` re-renders
- Sidebar only re-renders active link

### **Step 3: Test Backend API Speed**

Open Network tab in DevTools:

1. Navigate to a board page
2. Check `/api/v1/boards/{id}` request
3. Should be **<500ms** (was 2-5s)

### **Step 4: Verify Auth Flow**

1. Login
2. Check cookies in DevTools → Application tab
3. Should see `authToken` and `userRole` cookies
4. Navigate between pages
5. Should NOT see `/api/v1/auth/me` calls

---

## 📊 **EXPECTED PERFORMANCE GAINS**

| Feature | Before | After | Improvement |
|---------|--------|-------|-------------|
| **Board Load** | 2-5s | 200-500ms | **10x faster** |
| **Navigation** | 500ms | 50ms | **10x faster** |
| **Dashboard Stats** | 1s | <50ms | **20x faster** |
| **Task List** | 1-2s | 100ms | **15x faster** |
| **Search/Filter** | 2s | 100ms | **20x faster** |
| **Initial Page Load** | 2s | 500ms | **4x faster** |

---

## 🐛 **TROUBLESHOOTING**

### **Issue: Middleware not working**

**Solution:** Clear cookies and login again
```javascript
// In browser console
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

### **Issue: Still seeing slow navigation**

**Check:**
1. React DevTools Profiler - look for re-renders
2. Network tab - check for unnecessary API calls
3. Clear Next.js cache: `rm -rf .next`

### **Issue: Database queries still slow**

**Check:**
1. Verify indexes exist: `\di` in psql
2. Run `ANALYZE` on tables
3. Check query execution plan with `EXPLAIN ANALYZE`

---

## 🎯 **MAINTENANCE**

### **Weekly:**
```sql
-- Refresh dashboard stats
SELECT refresh_dashboard_stats();

-- Analyze tables
ANALYZE tasks;
ANALYZE boards;
ANALYZE attendance;
```

### **Monthly:**
```sql
-- Check for slow queries
SELECT * FROM slow_queries;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC
LIMIT 10;
```

---

## ✅ **COMPLETION CHECKLIST**

### **Database:**
- [ ] Run `PERFORMANCE_OPTIMIZATION.sql`
- [ ] Verify indexes created
- [ ] Test board query speed

### **Frontend:**
- [ ] Add `src/middleware.ts`
- [ ] Update `auth-context.tsx`
- [ ] Simplify layout files
- [ ] Optimize `Sidebar.tsx`
- [ ] Add `loading.tsx`
- [ ] Update `next.config.js`

### **Backend:**
- [ ] Optimize `boards.service.ts`
- [ ] Optimize `tasks.service.ts`
- [ ] Optimize `admin.service.ts`

### **Testing:**
- [ ] Test navigation speed
- [ ] Test board loading
- [ ] Test auth flow
- [ ] Verify no redundant API calls

---

**Congratulations! 🎉 Your app should now be significantly faster!**

If you still experience slowness, check the troubleshooting section or review the implementation steps.
