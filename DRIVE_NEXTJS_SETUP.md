# Google Drive - Next.js Integration Setup

## ✅ What's Done

- ✅ Next.js API routes created (uses your existing auth)
- ✅ Drive service library created
- ✅ Frontend updated to use Next.js API
- ✅ Drive page created at `/drive`
- ✅ Menu item added to sidebar

## 📋 Setup Steps

### 1. Install googleapis Package

```cmd
npm install googleapis
```

### 2. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project
3. Enable **Google Drive API**
4. Create OAuth 2.0 credentials:
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:3000/api/drive/callback`
5. Copy Client ID and Client Secret

### 3. Add to .env.local

Update `.env.local` with your Google credentials:

```env
GOOGLE_CLIENT_ID=your_actual_client_id
GOOGLE_CLIENT_SECRET=your_actual_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/drive/callback
```

### 4. Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
-- See CREATE_GOOGLE_DRIVE_TABLES.sql file
```

### 5. Restart Next.js

```cmd
# Stop current server (Ctrl+C)
npm run dev
```

## 🎯 Usage

1. Login to your app
2. Click **"Drive"** in sidebar
3. Click **"Connect with Google"**
4. Authorize with your Google account
5. Upload, share, and manage files!

## ✨ Features

- **My Drive**: Upload, create folders, delete, download
- **Shared by me**: Track who you've shared with, revoke access
- **Shared with me**: View files others shared with you
- **Private sharing**: Only sender and receiver see shares

## 🔧 Architecture

```
Frontend (/drive) → Next.js API Routes (/api/drive/*) → Google Drive API
                            ↓
                    Supabase (tokens & shares)
```

## ❌ No Express Backend Needed!

The Express backend (`backend/` folder) is NOT used for Drive. Everything runs through Next.js API routes that use your existing authentication.

## 🚀 Next Steps

1. Run `npm install googleapis`
2. Add Google OAuth credentials to `.env.local`
3. Run SQL to create tables
4. Restart Next.js server
5. Test!
