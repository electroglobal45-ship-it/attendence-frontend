# Google Drive Integration - Setup Guide

## ✅ What's Been Implemented

### Backend (Express - Port 5000)
- ✅ Complete Google OAuth 2.0 authentication
- ✅ Token management (auto-refresh)
- ✅ File operations (upload, download, delete, rename, create folders)
- ✅ Private sharing system (only sender & receiver can see shares)
- ✅ Activity logging
- ✅ All routes and controllers ready

### Frontend (Next.js)
- ✅ Drive page for Admin (`/drive`)
- ✅ Drive page for Employee (`/drive`)
- ✅ API client library (`drive-api.ts`)
- ✅ Connection status UI
- ✅ My Drive tab (upload, create folders, manage files)
- ✅ Shared by me tab (see who you've shared with, revoke access)
- ✅ Shared with me tab (see files others shared with you)
- ✅ ShareModal (select employees, set permissions, add message)
- ✅ Menu item added to Sidebar (both admin & employee)

## 📋 Setup Steps

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google Drive API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "Attendance Portal Drive Integration"
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/google/callback
     http://localhost:5000/api/v1/drive/auth/callback
     ```
   - Click "Create"
   - **Copy** the Client ID and Client Secret

### 2. Create Database Tables

1. Open Supabase SQL Editor
2. Run the `CREATE_GOOGLE_DRIVE_TABLES.sql` script:

```sql
-- This creates 3 tables:
-- 1. google_drive_tokens (stores OAuth tokens)
-- 2. drive_shares (tracks private file sharing)
-- 3. drive_activity (logs all drive actions)
```

### 3. Add Environment Variables

#### Backend (.env)
Add these to `backend/.env`:

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/drive/auth/callback

# Frontend URL (for redirects after OAuth)
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env.local)
Already configured - no changes needed!

### 4. Start the Servers

#### Terminal 1 - Backend
```cmd
cd backend
npm run dev
```
Backend will run on **http://localhost:5000**

#### Terminal 2 - Frontend
```cmd
npm run dev
```
Frontend will run on **http://localhost:3000**

### 5. Test the Integration

1. **Login** as admin or employee
2. Click **"Drive"** in the sidebar
3. Click **"Connect with Google"**
4. Authorize the app with your Google account
5. You'll be redirected back to the Drive page
6. Try:
   - Upload a file
   - Create a folder
   - Share a file with another employee
   - Check "Shared by me" and "Shared with me" tabs

## 🔐 How Private Sharing Works

### Privacy Model
- When you share a file with someone, **ONLY you and that person** can see the share
- Other users cannot see your shares in the system
- Each share creates a unique entry in the `drive_shares` table
- Filters are applied at the database level:
  - `shared_by_me`: Only shows shares where `shared_by = your_user_id`
  - `shared_with_me`: Only shows shares where `shared_with = your_user_id`

### Permissions
- **reader**: Can view only
- **commenter**: Can view and comment
- **writer**: Can view, comment, and edit

### Share Tracking
- See if recipient has viewed the file
- Track when file was last accessed
- Revoke access anytime

## 🎯 Features Available

### My Drive
- ✅ Upload files (up to 100MB)
- ✅ Create folders
- ✅ Delete files/folders
- ✅ Download files
- ✅ Rename files
- ✅ Open in Google Drive (full editing)
- ✅ Share with employees

### Shared by Me
- ✅ See all files you've shared
- ✅ Track who has viewed
- ✅ See permissions granted
- ✅ Revoke access anytime

### Shared with Me
- ✅ See files others shared with you
- ✅ Open in Google Drive
- ✅ Download locally
- ✅ View/Edit based on permissions

## 🔧 Troubleshooting

### Backend not running?
```cmd
cd backend
npm run dev
```
Check for errors in terminal

### "Cannot find module 'googleapis'"?
```cmd
cd backend
npm install googleapis
```

### OAuth redirect mismatch?
Make sure the redirect URI in Google Cloud Console exactly matches:
```
http://localhost:5000/api/v1/drive/auth/callback
```

### "Unauthorized" or "Forbidden" errors?
- Make sure you're logged in
- Check that `authToken` exists in localStorage (F12 → Application → Local Storage)
- Verify backend is running on port 5000

### CORS errors?
Backend is configured to allow `http://localhost:3000`. If you're using a different port, update `CORS_ORIGIN` in `backend/.env`

## 📁 File Structure

```
backend/
  src/modules/drive/
    ├── drive.controller.ts  # API endpoints
    ├── drive.service.ts     # Business logic
    └── drive.routes.ts      # Route definitions

frontend/
  src/
    ├── lib/drive-api.ts              # API client
    ├── app/(admin)/drive/page.tsx    # Admin drive page
    ├── app/(employee)/drive/page.tsx # Employee drive page
    └── components/layout/Sidebar.tsx # Updated with Drive link

database/
  └── CREATE_GOOGLE_DRIVE_TABLES.sql  # Database schema
```

## 🚀 Next Steps

1. **Production Deployment**:
   - Update redirect URIs in Google Cloud Console
   - Add production URLs to `.env` files
   - Enable SSL/HTTPS

2. **Additional Features** (Optional):
   - Search functionality
   - File preview
   - Batch operations
   - Advanced permissions
   - Team folders

## 📞 Support

If you encounter any issues:
1. Check browser console (F12) for errors
2. Check backend terminal for errors
3. Verify all environment variables are set
4. Make sure both servers are running
5. Confirm Google OAuth credentials are correct

---

**Ready to use!** 🎉

Just complete the setup steps above and you'll have a fully functional Google Drive integration with private sharing!
