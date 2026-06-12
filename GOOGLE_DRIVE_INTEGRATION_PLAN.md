# 🚀 Google Drive Integration - Complete Plan

## 🎯 Your Requirements

> "Give drive option in sidebar → Users login to their drive → Share files to other employees through dashboard"

---

## 📋 How It Will Work

### **User Flow**

```
1. User clicks "Drive" in sidebar
   ↓
2. If not connected: Shows "Connect Google Drive" button
   ↓
3. User clicks → OAuth popup opens (Google login)
   ↓
4. User authorizes → Gets redirected back with access token
   ↓
5. Token saved in database (per user)
   ↓
6. Drive dashboard loads showing:
   - User's files from their Google Drive
   - Shared files from other employees
   - Upload/Create options
   - Share with employees feature
```

---

## 🏗️ Architecture

### **Frontend (Next.js)**
```
├── Sidebar
│   └── "Drive" menu item (🗂️ icon)
│
├── /drive page
│   ├── Connection status
│   ├── File browser (grid/list view)
│   ├── Upload button
│   ├── Create folder button
│   ├── Share modal
│   └── Search/filter
│
└── Components
    ├── DriveConnectButton.tsx
    ├── DriveFileBrowser.tsx
    ├── DriveShareModal.tsx
    └── DriveFileViewer.tsx
```

### **Backend (Express + Supabase)**
```
├── Google OAuth Routes
│   ├── GET  /api/v1/drive/auth/url       (Get OAuth URL)
│   ├── GET  /api/v1/drive/auth/callback  (Handle OAuth callback)
│   └── POST /api/v1/drive/disconnect     (Revoke access)
│
├── Drive API Routes
│   ├── GET  /api/v1/drive/files          (List user's files)
│   ├── GET  /api/v1/drive/shared         (List shared files)
│   ├── POST /api/v1/drive/share          (Share file with employees)
│   ├── POST /api/v1/drive/upload         (Upload file)
│   └── GET  /api/v1/drive/download/:id   (Download/view file)
│
└── Database Tables
    ├── google_drive_tokens (store OAuth tokens per user)
    └── drive_shares (track who shared what with whom)
```

---

## 🗄️ Database Schema

### **Table: google_drive_tokens**
```sql
CREATE TABLE google_drive_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  email VARCHAR(255), -- Google account email
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### **Table: drive_shares**
```sql
CREATE TABLE drive_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id VARCHAR(255) NOT NULL, -- Google Drive file ID
  file_name VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  file_url TEXT,
  shared_by UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(20) DEFAULT 'view', -- view, comment, edit
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message TEXT, -- Optional message when sharing
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_drive_shares_shared_with ON drive_shares(shared_with);
CREATE INDEX idx_drive_shares_shared_by ON drive_shares(shared_by);
```

---

## 🔐 Google OAuth Setup

### **Step 1: Create Google Cloud Project**
1. Go to https://console.cloud.google.com/
2. Create new project: "Attendance Portal Drive Integration"
3. Enable Google Drive API
4. Create OAuth 2.0 credentials

### **Step 2: Configure OAuth Consent Screen**
- App name: "Attendance Portal"
- User support email: Your email
- Scopes needed:
  - `https://www.googleapis.com/auth/drive.file` (files created by app)
  - `https://www.googleapis.com/auth/drive.readonly` (read-only access)
  - `https://www.googleapis.com/auth/userinfo.email` (user's email)

### **Step 3: Create OAuth Client**
- Application type: Web application
- Authorized redirect URIs:
  - `http://localhost:3000/api/drive/callback` (development)
  - `https://yourdomain.com/api/drive/callback` (production)

### **Step 4: Add to .env**
```env
# Google Drive OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/drive/callback

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

---

## 🎨 UI/UX Design

### **Sidebar Menu Item**
```
📊 Dashboard
📅 Attendance  
📋 Tasks
📁 Projects
🗂️ Drive          ← NEW
👥 Employees
⚙️ Settings
```

### **Drive Dashboard Layout**
```
┌─────────────────────────────────────────────────────────┐
│  🗂️ Google Drive                    [🔄] [⬆️ Upload]    │
├─────────────────────────────────────────────────────────┤
│  📁 My Drive    📤 Shared by me    📥 Shared with me    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐               │
│  │ 📄   │  │ 📊   │  │ 📁   │  │ 🖼️   │               │
│  │Report│  │Sheet │  │Design│  │Logo  │               │
│  │.pdf  │  │.xlsx │  │      │  │.png  │               │
│  │      │  │      │  │      │  │      │               │
│  │ [👁️] │  │ [👁️] │  │ [👁️] │  │ [👁️] │               │
│  │ [📤] │  │ [📤] │  │ [📤] │  │ [📤] │               │
│  └──────┘  └──────┘  └──────┘  └──────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **Share Modal**
```
┌─────────────────────────────────────────┐
│  Share "Report.pdf"              [×]    │
├─────────────────────────────────────────┤
│                                         │
│  Select employees to share with:        │
│                                         │
│  🔍 Search employees...                 │
│                                         │
│  ☐ John Doe (john@company.com)         │
│  ☑️ Jane Smith (jane@company.com)       │
│  ☑️ Bob Johnson (bob@company.com)       │
│  ☐ Alice Williams (alice@company.com)  │
│                                         │
│  Permission:  [View ▼]                  │
│                                         │
│  Message (optional):                    │
│  ┌─────────────────────────────────┐   │
│  │ Please review this report       │   │
│  └─────────────────────────────────┘   │
│                                         │
│              [Cancel]  [Share File]     │
└─────────────────────────────────────────┘
```

---

## 📝 Features Breakdown

### **Phase 1: Basic Integration** ✅
1. ✅ Connect Google Drive (OAuth)
2. ✅ View user's files
3. ✅ Disconnect option
4. ✅ Token refresh mechanism

### **Phase 2: File Management** ✅
5. ✅ Upload files to Drive
6. ✅ Create folders
7. ✅ View/download files
8. ✅ Delete files
9. ✅ Search files

### **Phase 3: Sharing** ✅
10. ✅ Share files with specific employees
11. ✅ View shared files dashboard
12. ✅ Set permissions (view/edit)
13. ✅ Add message when sharing
14. ✅ Email notifications

### **Phase 4: Advanced** 🚀
15. 🚀 Real-time collaboration
16. 🚀 File version history
17. 🚀 Comments on files
18. 🚀 File activity tracking
19. 🚀 Bulk sharing
20. 🚀 Team folders

---

## 🔒 Security Considerations

### **Token Storage**
- ✅ Tokens encrypted in database
- ✅ Refresh tokens rotated regularly
- ✅ Automatic token expiry handling
- ✅ Secure token transmission (HTTPS only)

### **Access Control**
- ✅ Users only see their own Drive files
- ✅ Shared files scoped to organization
- ✅ Role-based permissions
- ✅ Admin can view all shares (audit)

### **Data Privacy**
- ✅ No file content stored on our servers
- ✅ All data fetched from Google Drive API
- ✅ User can disconnect anytime
- ✅ Tokens deleted on disconnect

---

## 🔄 OAuth Flow (Detailed)

```
┌─────────┐                                    ┌─────────┐
│ Browser │                                    │  Server │
└────┬────┘                                    └────┬────┘
     │                                              │
     │ 1. User clicks "Connect Drive"               │
     ├──────────────────────────────────────────────>
     │                                              │
     │ 2. Request OAuth URL                         │
     │    GET /api/v1/drive/auth/url                │
     ├──────────────────────────────────────────────>
     │                                              │
     │ 3. Return Google OAuth URL                   │
     │<─────────────────────────────────────────────┤
     │                                              │
     │ 4. Redirect to Google                        │
     │──────────────────>┌──────────┐              │
     │                   │  Google  │              │
     │                   │  OAuth   │              │
     │ 5. User logs in   └──────────┘              │
     │    & authorizes                              │
     │                                              │
     │ 6. Redirect back with code                   │
     │<─────────────────────────────┐              │
     │  ?code=abc123                │              │
     │                                              │
     │ 7. Send code to backend                      │
     │    GET /api/v1/drive/auth/callback?code=...  │
     ├──────────────────────────────────────────────>
     │                                              │
     │                              8. Exchange code │
     │                                 for tokens   │
     │                              ┌──────────────>│
     │                              │   Google API  │
     │                              │<──────────────┤
     │                                              │
     │                              9. Save tokens  │
     │                                 to database  │
     │                                              │
     │ 10. Redirect to /drive                       │
     │<─────────────────────────────────────────────┤
     │                                              │
     │ 11. Fetch files from Drive                   │
     │    GET /api/v1/drive/files                   │
     ├──────────────────────────────────────────────>
     │                                              │
     │                              12. Use token to│
     │                                  fetch files │
     │                              ┌──────────────>│
     │                              │   Google API  │
     │                              │<──────────────┤
     │                                              │
     │ 13. Return files                             │
     │<─────────────────────────────────────────────┤
     │                                              │
     │ 14. Display files                            │
     │                                              │
```

---

## 📦 NPM Packages Needed

### **Backend**
```bash
npm install googleapis
npm install @google-cloud/storage  # Optional for advanced features
```

### **Frontend**
```bash
# Already have these:
# - lucide-react (for icons)
# - Next.js built-in features
```

---

## 🚦 Implementation Steps

### **Step 1: Setup Google Cloud** (15 min)
- Create project
- Enable Drive API
- Configure OAuth consent
- Get credentials

### **Step 2: Database** (10 min)
- Create migration files
- Run migrations
- Test tables

### **Step 3: Backend - OAuth** (30 min)
- Create drive module
- OAuth routes
- Token storage
- Token refresh

### **Step 4: Backend - Drive API** (45 min)
- List files endpoint
- Upload endpoint
- Share endpoint
- Download endpoint

### **Step 5: Frontend - Pages** (60 min)
- Drive page layout
- Connect button
- File browser
- Upload UI

### **Step 6: Frontend - Sharing** (45 min)
- Share modal
- Employee selector
- Permission dropdown
- Share tracking

### **Step 7: Testing** (30 min)
- OAuth flow
- File operations
- Sharing
- Error handling

**Total Time: ~3.5 hours**

---

## 💡 How Sharing Works (Technical)

### **Option 1: Google Drive Native Sharing** (Recommended)
```typescript
// When user shares file:
1. Get file from user's Drive
2. Use Drive API to add permissions
3. Add employee's Google account email
4. Send email notification via Drive
5. Track share in our database
```

**Pros:**
- ✅ Uses Google's robust permissions
- ✅ Real-time collaboration
- ✅ Version history
- ✅ Comments work natively

**Cons:**
- ❌ Requires employees to have Google accounts
- ❌ Relies on Google's infrastructure

### **Option 2: Proxy Sharing** (Alternative)
```typescript
// When user shares file:
1. Get file metadata
2. Store file_id + permissions in our DB
3. Employee accesses via our portal
4. Our backend proxies requests to Drive
5. Returns file content
```

**Pros:**
- ✅ No Google account needed for employees
- ✅ More control over access
- ✅ Can add custom permissions

**Cons:**
- ❌ No real-time collaboration
- ❌ We manage all permissions
- ❌ More complex backend

### **Recommended: Hybrid Approach**
- Use Option 1 for Google account users
- Use Option 2 for non-Google users
- Best of both worlds!

---

## 🎯 Next Steps

1. **Do you want to proceed with implementation?**
2. **Which sharing approach do you prefer?**
   - Native Google sharing (requires Google accounts)
   - Proxy sharing (works without Google accounts)
   - Hybrid (both)

3. **Priority features?**
   - Just viewing files?
   - Full collaboration (edit, comment)?
   - File upload from portal?

Let me know and I'll start building! 🚀
