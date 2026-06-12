# Troubleshooting: Employees Not Showing

## Problem
After adding Google Drive integration, employees page is not loading data.

## Root Cause
Your application uses **TWO separate backends**:
1. **Express Backend** (`backend/` folder) - Used for custom APIs (we added Drive here)
2. **Next.js API Routes** (`src/app/api/` folder) - Used for ALL existing features (employees, attendance, tasks, etc.)

The Google Drive code was added to the Express backend, but it **doesn't affect** your existing features because they use Next.js API routes that connect directly to Supabase.

## Quick Fix Steps

### 1. Restart Next.js Frontend
```cmd
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### 2. Check Browser Console
Open your browser's Developer Tools (F12) and check for errors:
- Go to Console tab
- Try loading the employees page
- Look for any red errors about:
  - CORS issues
  - Authentication failures
  - Network errors (failed API calls)

### 3. Test the API Route Directly
Open a new browser tab and try:
```
http://localhost:3000/api/employees
```

You should see either:
- A list of employees (if logged in as admin)
- An authentication error (if not logged in)
- A 404 error means Next.js isn't running

### 4. Verify Environment Variables
Make sure `.env.local` is in the root directory and contains:
```
SUPABASE_URL=https://olsgdfjgxgttpxkzudxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_SUPABASE_URL=https://olsgdfjgxgttpxkzudxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 5. Check if Logged In
- Make sure you're logged in as an admin
- Check localStorage for `authToken` in browser DevTools:
  - F12 → Application tab → Local Storage → http://localhost:3000
  - Look for `authToken` key

### 6. Clear Browser Cache
Sometimes browsers cache API responses:
- Hard refresh: Ctrl + Shift + R
- Or clear all cache for localhost

## What We Changed (That Shouldn't Affect This)

We only modified files in `backend/src/modules/drive/` which is the Express backend. Your employees page uses Next.js API routes (`src/app/api/employees/route.ts`) which we didn't touch.

## If Still Not Working

Please check:
1. Is Next.js dev server running? (`npm run dev`)
2. Any errors in terminal where Next.js is running?
3. Any errors in browser console (F12)?
4. Can you access other pages (tasks, attendance)?

## Important Note

The Express backend (`backend/`) is NOT used by your frontend currently. It's running separately on port 5000. For Google Drive to work, we'll need to:
1. Either migrate drive integration to Next.js API routes
2. Or start using the Express backend for all features

But that's a separate concern. Your employees page should work independently of the Express backend.
