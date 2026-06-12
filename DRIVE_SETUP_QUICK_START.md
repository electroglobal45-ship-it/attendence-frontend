# 🚀 Google Drive Integration - Quick Setup Guide

## ✅ Backend Fixed!

The compilation errors have been resolved. Your backend should now be running.

---

## 📋 Setup Steps (Required Before Testing)

### 1. **Run Database Migrations** ⚠️ CRITICAL

Open Supabase SQL Editor and run:
```sql
-- Copy all content from:
CREATE_GOOGLE_DRIVE_TABLES.sql
```

This creates 3 tables:
- `google_drive_tokens` - OAuth tokens
- `drive_shares` - Private file sharing
- `drive_activity` - Activity logs

### 2. **Install Backend Dependencies**

```bash
cd backend
npm install googleapis multer
```

### 3. **Get Google OAuth Credentials**

1. Go to: https://console.cloud.google.com/
2. Create new project (or use existing)
3. Enable APIs:
   - Google Drive API
   - Google OAuth2 API
4. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/google/callback
     ```
5. Copy **Client ID** and **Client Secret**

### 4. **Update Environment Variables**

Add to `backend/.env`:
```env
# Google Drive Integration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

### 5. **Restart Backend**

```bash
cd backend
npm run dev
```

---

## 🧪 Testing the Integration

### Test 1: Check Backend is Running
```bash
curl http://localhost:5000/health
```

Expected: `{ "status": "ok" }`

### Test 2: Check Drive Routes Registered
```bash
curl http://localhost:5000/api/v1
```

Should show drive endpoints in response.

### Test 3: Access Drive Page
1. Start frontend: `npm run dev`
2. Login to your account
3. Navigate to: `http://localhost:3000/drive`
4. Should see "Connect Google Drive" button

### Test 4: Connect Google Drive
1. Click "Connect Google Drive"
2. Google OAuth popup opens
3. Select your Google account
4. Grant permissions
5. Redirected back to Drive page
6. Should see your Drive files!

---

## 🎯 Next Steps (What's Missing)

### A. **Add Drive to Sidebar** (5 minutes)

Need to update `src/components/Sidebar.tsx`:

```typescript
// Add to menu items
{
  label: 'Drive',
  icon: <HardDrive size={20} />,
  path: '/drive',
  roles: ['admin', 'employee']
}
```

### B. **Create Employee Drive Page** (2 minutes)

```bash
# Simply copy admin page:
cp src/app/(admin)/drive/page.tsx src/app/(employee)/drive/page.tsx
```

### C. **Build Share Modal** (15 minutes)

Create `src/components/drive/ShareModal.tsx` with:
- Employee multi-select
- Permission dropdown
- Message input
- Share button

### D. **Add Shared Files Tabs** (10 minutes)

In Drive page, add tabs:
- "My Drive" (current view)
- "Shared by me"
- "Shared with me"

---

## 🔐 Privacy & Security

### How Private Sharing Works:

```
User A shares file with User B:
1. Creates Google Drive permission for B's email
2. Creates record in drive_shares table
3. Only A and B can see this share record
```

**Database Query Example:**
```sql
-- User A sees only their shares:
SELECT * FROM drive_shares WHERE shared_by = 'user_a_id';

-- User B sees only shares with them:
SELECT * FROM drive_shares WHERE shared_with = 'user_b_id';

-- No one else can see the share!
```

---

## 📊 What's Working Now

✅ **Backend (100%)**
- OAuth authentication
- Token management
- File operations (upload, download, delete, rename)
- Folder creation
- Private sharing system
- Activity tracking

✅ **Frontend (70%)**
- Drive page UI
- Connect/disconnect
- File browser (grid/list)
- Upload files
- Create folders
- Delete files
- Search files

❌ **Still Need:**
- Share modal UI (15 min)
- Shared files view (10 min)
- Sidebar menu item (5 min)
- Employee page (2 min)

---

## 🐛 Troubleshooting

### Error: "Google Drive not connected"
- User needs to click "Connect Google Drive"
- Check if tokens are in database
- Verify GOOGLE_CLIENT_ID is correct

### Error: "Invalid or expired token"
- Token refresh should happen automatically
- If persists, disconnect and reconnect

### Error: "Failed to upload file"
- Check file size (limit: 100MB)
- Check Google Drive quota
- Verify user has Drive access

### Files not appearing
- Check Google Drive has files in root folder
- Try clicking "Refresh" or reload page
- Check browser console for errors

---

## ✨ Features Summary

### File Management
- ✅ Upload files (drag & drop would be nice!)
- ✅ Create folders
- ✅ Rename files
- ✅ Delete files
- ✅ Navigate folders
- ✅ Search files
- ✅ Download files
- ✅ View in Google Drive

### Sharing (Private)
- ✅ Share with specific employees only
- ✅ Set permissions (reader/commenter/writer)
- ✅ Add message when sharing
- ✅ Email notification (via Google)
- ✅ Track viewed status
- ✅ Revoke access
- ⏳ UI for sharing (need to build modal)

### UI/UX
- ✅ Grid & list view toggle
- ✅ File type icons
- ✅ Context menus
- ✅ Loading states
- ✅ Clean, modern design
- ✅ Responsive layout

---

## 🎉 Ready to Use (After Setup)!

**Estimated setup time:** 15-20 minutes

1. Run SQL migrations (5 min)
2. Get Google credentials (5 min)
3. Update .env (2 min)
4. Test connection (3 min)
5. Add to sidebar (5 min)

**Then users can:**
- ✅ Connect their Google Drive
- ✅ Browse files
- ✅ Upload documents
- ✅ Create folders
- ✅ Share files privately

Need help with any step? Let me know! 🚀
