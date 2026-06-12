# 🔐 Authentication & API Fetch Flow - Complete Explanation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Authentication Flow](#authentication-flow)
3. [API Request Flow](#api-request-flow)
4. [Step-by-Step Examples](#step-by-step-examples)
5. [Component Interactions](#component-interactions)
6. [Security Mechanisms](#security-mechanisms)

---

## Architecture Overview

Your application uses a **DUAL-SERVER ARCHITECTURE**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  React Components (Next.js Frontend)                   │     │
│  │  - Uses localStorage to store JWT token               │     │
│  │  - SessionProvider manages auth state                 │     │
│  │  - Port: 3000 (Next.js dev server)                   │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
         │                                      │
         │ fetch()                             │ fetch()
         ▼                                      ▼
┌──────────────────────┐            ┌────────────────────────┐
│   Next.js API        │            │   Express Backend      │
│   Routes             │            │   (Separate Server)    │
│   (Port 3000)        │            │   (Port 5000)         │
│   /api/auth/login    │            │   /api/v1/tasks       │
│   /api/projects/...  │            │   /api/v1/attendance  │
└──────────────────────┘            └────────────────────────┘
         │                                      │
         └──────────────┬───────────────────────┘
                        ▼
              ┌──────────────────┐
              │   Supabase       │
              │   - Auth         │
              │   - Database     │
              │   - Storage      │
              └──────────────────┘
```

### Key Points:
- **Frontend**: Next.js (React) on port 3000
- **Backend Option 1**: Next.js API routes (`/api/*`) - used for some auth/project endpoints
- **Backend Option 2**: Express.js server (`/api/v1/*`) - used for most business logic
- **Database**: Supabase PostgreSQL + Auth

---

## Authentication Flow

### 🔑 **LOGIN PROCESS** (Step-by-Step)

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────┐
│  User    │────▶│  Login Page  │────▶│  Next.js    │────▶│  Supabase  │
│  enters  │     │  Component   │     │  API Route  │     │  Database  │
│  email   │     │              │     │             │     │  + Auth    │
│  password│     └──────────────┘     └─────────────┘     └────────────┘
└──────────┘
```

#### **Step 1: User submits login form**
**File:** `src/components/providers/SessionProvider.tsx`
```typescript
const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {  // ← Goes to Next.js API route
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  // ...
}
```

#### **Step 2: Next.js API Route receives request**
**File:** `src/app/api/auth/login/route.ts`
```typescript
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  
  // 1️⃣ Query database for user by email
  const { data: profile } = await supabaseServer
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()
  
  // 2️⃣ Verify plain text password (NOT hashed - your current implementation)
  if (profile.password_hash !== password) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }
  
  // 3️⃣ Sign in with Supabase Auth to get JWT token
  const { data: authData } = await supabaseServer.auth.signInWithPassword({
    email: email.toLowerCase(),
    password: password,
  })
  
  // 4️⃣ Return JWT access token + user info
  return NextResponse.json({
    success: true,
    token: authData.session.access_token,  // ← JWT token
    session: authData.session,
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      category: profile.category,
    },
  })
}
```

#### **Step 3: Frontend stores token and user**
**File:** `src/components/providers/SessionProvider.tsx`
```typescript
const login = async (email: string, password: string) => {
  // ...after successful response
  const data = await response.json()
  
  // Store in localStorage
  localStorage.setItem('authToken', data.token)        // ← JWT token
  localStorage.setItem('user', JSON.stringify(data.user))  // ← User object
  
  // Update React state
  setToken(data.token)
  setUser(data.user)
}
```

#### **Step 4: Token structure**
The JWT token looks like this:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkLTEyMyIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJlbXBsb3llZSIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MzI1NDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Decoded:
```json
{
  "sub": "user-id-123",           // User ID
  "email": "user@example.com",
  "role": "employee",
  "iat": 1616239022,              // Issued at
  "exp": 1616325422               // Expires at
}
```

---

## API Request Flow

### 📡 **FETCHING DATA FROM BACKEND** (Example: Get Tasks)

#### **Scenario: User wants to see their tasks**

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────┐
│  React   │────▶│   fetch()    │────▶│  Express    │────▶│  Supabase  │
│  Component│     │  with Bearer │     │  Backend    │     │  Database  │
│  useEffect│     │  token       │     │  Middleware │     │            │
└──────────┘     └──────────────┘     └─────────────┘     └────────────┘
     │                                         │                  │
     │  1. Get token from localStorage         │                  │
     │  2. Add to Authorization header         │                  │
     │                                        │                  │
     │                                        3. Verify token   │
     │                                        4. Extract user   │
     │                                                          │
     │                                                     5. Query DB
     │                                                          │
     │◀────────────────────────────────────────────────────────┘
     │  6. Return JSON response
     │
     7. Update UI state
```

### **Step 1: Frontend initiates request**

**File:** `src/components/board/BoardView.tsx` (example)
```typescript
useEffect(() => {
  const fetchBoard = async () => {
    const token = localStorage.getItem('authToken')  // ← Get JWT from storage
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
    
    const response = await fetch(`${BACKEND_URL}/api/v1/boards/${boardId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,  // ← Add token to header
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    // Use data...
  }
  
  fetchBoard()
}, [boardId])
```

### **Step 2: Request hits Express server**

**Request format:**
```http
GET http://localhost:5000/api/v1/boards/abc-123-def HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### **Step 3: Express routes to correct handler**

**File:** `backend/src/app.ts`
```typescript
// Routes registered here
app.use('/api/v1/boards', boardsRoutes)  // ← Matches /api/v1/boards/*
```

**File:** `backend/src/modules/boards/boards.routes.ts`
```typescript
import { authenticate } from '../../middleware/auth.middleware'

const router = Router()

// All board routes require authentication
router.use(authenticate)  // ← This middleware runs BEFORE controller

// GET /api/v1/boards/:boardId
router.get('/:boardId', (req, res) => boardsController.getBoardWithDetails(req, res))
```

### **Step 4: Authentication Middleware validates token**

**File:** `backend/src/middleware/auth.middleware.ts`
```typescript
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1️⃣ Extract token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // 2️⃣ Verify token with Supabase Auth
    const user = await getUserFromToken(token)  // ← Validates JWT
    
    // 3️⃣ Attach user to request object
    req.user = user  // Now available in controller
    
    // 4️⃣ Continue to controller
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

**File:** `backend/src/config/supabase.ts` - Token verification
```typescript
export const getUserFromToken = async (token: string) => {
  // 1️⃣ Verify JWT token with Supabase Auth
  const { data: { user: authUser }, error: authError } = 
    await supabaseClient.auth.getUser(token)
  
  if (authError || !authUser) {
    throw new Error('Invalid or expired token')
  }
  
  // 2️⃣ Fetch user profile from database
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, category, is_active')
    .eq('id', authUser.id)
    .single()
  
  if (!user || !user.is_active) {
    throw new Error('User not found or inactive')
  }
  
  return user  // Returns: { id, email, name, role, category }
}
```

### **Step 5: Controller handles business logic**

**File:** `backend/src/modules/boards/boards.controller.ts`
```typescript
async getBoardWithDetails(req: AuthRequest, res: Response) {
  try {
    const { boardId } = req.params
    const userId = req.user?.id      // ← User ID from middleware
    const userRole = req.user?.role  // ← User role from middleware
    
    // Call service layer
    const boardData = await boardsService.getBoardWithDetails(boardId, userId, userRole)
    
    return successResponse(res, boardData)
  } catch (error: any) {
    return errorResponse(res, error.message, 500)
  }
}
```

### **Step 6: Service queries database**

**File:** `backend/src/modules/boards/boards.service.ts`
```typescript
async getBoardWithDetails(boardId: string, userId?: string, userRole?: string) {
  // Query Supabase database
  const { data: board, error } = await supabaseAdmin
    .from('boards')
    .select(`
      *,
      project:projects(id, name),
      board_members(*, user:users(id, name, email))
    `)
    .eq('id', boardId)
    .single()
  
  if (error) throw new Error(`Failed to fetch board: ${error.message}`)
  
  return board
}
```

### **Step 7: Response sent back to frontend**

**Response format:**
```json
{
  "success": true,
  "message": "Board fetched successfully",
  "data": {
    "board": {
      "id": "abc-123",
      "name": "Project Tasks",
      "description": "...",
      "project": { "id": "...", "name": "..." }
    },
    "members": [...],
    "lists": [...],
    "tasks": [...]
  }
}
```

### **Step 8: Frontend updates UI**

```typescript
const data = await response.json()
if (data.success) {
  setBoard(data.data.board)
  setLists(data.data.lists)
  setTasks(data.data.tasks)
}
```

---

## Step-by-Step Examples

### 🎯 **Example 1: Creating a New Task**

#### **Frontend Component**
```typescript
// src/components/board/List.tsx
const createTask = async () => {
  const token = localStorage.getItem('authToken')
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
  
  const response = await fetch(`${BACKEND_URL}/api/v1/tasks/quick-create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: newTaskName,
      list_id: listId,
      board_id: boardId
    })
  })
  
  const result = await response.json()
  if (result.success) {
    // Add to local state
    setTasks([...tasks, result.data.task])
  }
}
```

#### **Backend Route**
```typescript
// backend/src/modules/tasks/tasks.routes.ts
router.post('/quick-create', 
  authenticate,           // ← Middleware validates token
  requireEmployee,        // ← Middleware checks role
  (req, res) => tasksController.quickCreateTask(req, res)
)
```

#### **Backend Controller**
```typescript
// backend/src/modules/tasks/tasks.controller.ts
async quickCreateTask(req: AuthRequest, res: Response) {
  const userId = req.user?.id  // From middleware
  const { title, list_id, board_id } = req.body
  
  const task = await tasksService.quickCreateTask({
    title,
    list_id,
    board_id,
    created_by: userId,
    assigned_to: userId
  })
  
  return createdResponse(res, { task }, 'Task created successfully')
}
```

#### **Backend Service**
```typescript
// backend/src/modules/tasks/tasks.service.ts
async quickCreateTask(data: { title, list_id, ... }) {
  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      name: data.title,
      list_id: data.list_id,
      board_id: data.board_id,
      created_by: data.created_by,
      assigned_to: data.assigned_to,
      priority: 'medium',
      status: 'todo'
    })
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create task: ${error.message}`)
  return task
}
```

---

### 🎯 **Example 2: File Upload (Task Attachment)**

#### **Frontend**
```typescript
// src/components/board/TaskDetailModal.tsx
const uploadAttachment = async (file: File) => {
  const token = localStorage.getItem('authToken')
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
  
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch(
    `${BACKEND_URL}/api/v1/tasks/${taskId}/attachments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - browser sets it automatically for FormData
      },
      body: formData
    }
  )
  
  const result = await response.json()
  // Use result.data.attachment
}
```

#### **Backend Route with Multer**
```typescript
// backend/src/modules/tasks/tasks.routes.ts
import multer from 'multer'

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }  // 20MB
})

router.post('/:taskId/attachments',
  authenticate,
  requireEmployee,
  upload.single('file'),  // ← Processes multipart/form-data
  (req, res) => tasksController.uploadTaskAttachment(req, res)
)
```

#### **Backend Controller**
```typescript
async uploadTaskAttachment(req: AuthRequest, res: Response) {
  const { taskId } = req.params
  const userId = req.user?.id
  const file = (req as any).file  // Multer adds this
  
  // file contains: buffer, originalname, mimetype, size
  const attachment = await tasksService.uploadTaskAttachment(
    taskId,
    userId,
    file
  )
  
  return createdResponse(res, { attachment })
}
```

#### **Backend Service (Uploads to Supabase Storage)**
```typescript
async uploadTaskAttachment(taskId: string, userId: string, file: Express.Multer.File) {
  // 1. Upload to Supabase Storage
  const { url: fileUrl, path: filePath } = await uploadToStorage(
    taskId,
    file.originalname,
    file.buffer,
    file.mimetype
  )
  
  // 2. Save metadata to database
  const { data: attachment } = await supabaseAdmin
    .from('task_attachments')
    .insert({
      task_id: taskId,
      uploaded_by: userId,
      file_name: file.originalname,
      file_url: fileUrl,
      file_path: filePath,
      file_size: file.size,
      file_type: file.mimetype
    })
    .select()
    .single()
  
  return attachment
}
```

---

## Component Interactions

### 📊 **Architecture Diagram**

```
┌─────────────────────────────── FRONTEND (Next.js - Port 3000) ───────────────────────────────┐
│                                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐    │
│  │  SessionProvider (Context)                                                            │    │
│  │  - Manages: user, token, isLoading                                                    │    │
│  │  - Provides: login(), logout(), changePassword()                                      │    │
│  │  - Storage: localStorage                                                              │    │
│  └──────────────────────────────────────────────────────────────────────────────────────┘    │
│         │                                                                                      │
│         │ provides auth state                                                                 │
│         ▼                                                                                      │
│  ┌────────────────────────────────┐       ┌────────────────────────────────┐                 │
│  │  Page Components               │       │  Layout Components             │                 │
│  │  - /app/(admin)/tasks/page.tsx │       │  - Sidebar with user info      │                 │
│  │  - /app/(employee)/attendance  │       │  - Protected route wrapper     │                 │
│  │  - /app/projects/[id]/page.tsx │       │  - Role-based UI               │                 │
│  └────────────────────────────────┘       └────────────────────────────────┘                 │
│         │                                           │                                          │
│         │ useAuth() hook                            │ useAuth() hook                           │
│         ▼                                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐    │
│  │  API Call Functions                                                                   │    │
│  │  - Reads token from localStorage                                                      │    │
│  │  - Adds Authorization: Bearer {token} header                                          │    │
│  │  - Calls backend endpoints                                                            │    │
│  └──────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                                │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
                │                                          │
                │ HTTP Request                             │ HTTP Request
                │ with Bearer token                        │ with Bearer token
                ▼                                          ▼
┌────────────────────────────┐           ┌──────────────────────────────────────────┐
│  Next.js API Routes        │           │  Express Backend (Port 5000)             │
│  /api/auth/login           │           │  /api/v1/tasks                           │
│  /api/projects/[id]        │           │  /api/v1/boards                          │
│  /api/drive/*              │           │  /api/v1/attendance                      │
│                            │           │                                          │
│  Uses: supabase-server     │           │  Middleware: authenticate()              │
│  Direct DB access          │           │  Validates JWT token                     │
└────────────────────────────┘           │  Extracts user info                      │
                │                        │  Attaches to req.user                    │
                │                        └──────────────────────────────────────────┘
                │                                          │
                └──────────────┬───────────────────────────┘
                               ▼
                    ┌───────────────────────┐
                    │  Supabase             │
                    │  ┌─────────────────┐  │
                    │  │ Auth (JWT)      │  │
                    │  │ - Token verify  │  │
                    │  │ - User session  │  │
                    │  └─────────────────┘  │
                    │  ┌─────────────────┐  │
                    │  │ PostgreSQL DB   │  │
                    │  │ - users         │  │
                    │  │ - tasks         │  │
                    │  │ - boards        │  │
                    │  │ - attendance    │  │
                    │  └─────────────────┘  │
                    │  ┌─────────────────┐  │
                    │  │ Storage         │  │
                    │  │ - selfies       │  │
                    │  │ - attachments   │  │
                    │  └─────────────────┘  │
                    └───────────────────────┘
```

---

## Security Mechanisms

### 🔒 **1. Token-Based Authentication**

**How it works:**
- User logs in → receives JWT token
- Token stored in `localStorage`
- Every API request includes token in `Authorization` header
- Backend verifies token before processing request

**Token validation:**
```typescript
// Backend validates EVERY protected request
const { data: { user } } = await supabaseClient.auth.getUser(token)
if (!user) {
  throw new Error('Invalid token')
}
```

### 🔒 **2. Role-Based Access Control (RBAC)**

**Middleware checks:**
```typescript
// Only admins can access
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// Only employees (or admins) can access
export const requireEmployee = (req, res, next) => {
  if (req.user.role !== 'employee' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Employee access required' })
  }
  next()
}
```

**Route protection:**
```typescript
// Admin-only endpoint
router.get('/all', authenticate, requireAdmin, controller.getAllTasks)

// Employee can access
router.get('/my-tasks', authenticate, requireEmployee, controller.getUserTasks)
```

### 🔒 **3. Database Security**

**Row Level Security (RLS) is DISABLED in your setup:**
```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

**Instead, security is handled by:**
1. All database access goes through **service role key** (backend only)
2. Frontend cannot directly access database
3. Backend validates user permissions before queries

### 🔒 **4. CORS Protection**

```typescript
// backend/src/app.ts
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',  // Only allow Next.js
  credentials: true
}))
```

### ⚠️ **Security Issues in Your Current Setup**

1. **❌ Plain text passwords** - You store passwords as plain text!
   ```typescript
   // DON'T DO THIS
   if (profile.password_hash !== password) { ... }
   ```
   **Should use:** bcrypt hashing

2. **❌ No token expiration handling** - Frontend doesn't refresh expired tokens

3. **❌ localStorage security** - Vulnerable to XSS attacks
   **Better:** Use httpOnly cookies

---

## Summary

### **Authentication Summary:**
1. User enters email/password
2. Frontend sends to `/api/auth/login`
3. Backend verifies credentials against database
4. Backend calls Supabase Auth to generate JWT
5. JWT token returned to frontend
6. Frontend stores token in localStorage
7. All subsequent requests include token in header

### **API Fetch Summary:**
1. Frontend reads token from localStorage
2. Frontend makes fetch() with `Authorization: Bearer {token}`
3. Request hits Express backend
4. Middleware validates token with Supabase Auth
5. Middleware extracts user info and attaches to `req.user`
6. Controller receives authenticated request
7. Service queries database
8. Response sent back to frontend
9. Frontend updates UI

### **Key Files:**
- **Auth Flow:** `SessionProvider.tsx` → `/api/auth/login/route.ts` → Supabase
- **Token Storage:** `localStorage.getItem('authToken')`
- **Token Validation:** `backend/src/middleware/auth.middleware.ts`
- **Database Access:** `backend/src/config/supabase.ts` (service role)

---

## 🎓 Quick Reference

### **Making an Authenticated Request:**
```typescript
const token = localStorage.getItem('authToken')
const response = await fetch(`${BACKEND_URL}/api/v1/endpoint`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data })
})
```

### **Protecting a Backend Route:**
```typescript
router.get('/protected', 
  authenticate,      // Validates token
  requireAdmin,      // Checks role
  controller.handler
)
```

### **Accessing User Info in Controller:**
```typescript
async handler(req: AuthRequest, res: Response) {
  const userId = req.user?.id      // User ID
  const userRole = req.user?.role  // User role
  const userEmail = req.user?.email // User email
  // ...
}
```

---

**End of Documentation** 📚
