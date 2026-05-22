# 🚀 Quick Deployment Steps for Vercel

## The Problem
Your app works locally but on Vercel it redirects from dashboard → login → dashboard → login (infinite loop).

## Root Cause
Supabase session is not persisting properly on Vercel due to:
1. Environment variables not set correctly
2. Session storage configuration issues
3. Cookie/localStorage handling differences between localhost and Vercel

## The Solution (10 Minutes)

### 1️⃣ Update Vercel Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

**IMPORTANT: Delete ALL old Supabase variables first**, then add these 4 new ones:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://lxshgillxjohtideuugq.supabase.co` | ✅ Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4c2hnaWxseGpvaHRpZGV1dWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDAxMDUsImV4cCI6MjA5NTAxNjEwNX0.rfiWSYF2DodiwDCFsxdgOC2lAlWyCmKMzV0pADxjFc0` | ✅ Production, Preview, Development |
| `SUPABASE_URL` | `https://lxshgillxjohtideuugq.supabase.co` | ✅ Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4c2hnaWxseGpvaHRpZGV1dWdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ0MDEwNSwiZXhwIjoyMDk1MDE2MTA1fQ.EQgVBq86iVruzEAD8bJwpiloRp64w47--2IO08S4Xbw` | ✅ Production, Preview, Development |

⚠️ **CRITICAL**: Make sure to check ALL THREE environments (Production, Preview, Development) for EACH variable!

### 2️⃣ Clear Vercel Build Cache

After saving environment variables:
1. Go to **Settings** → **General**
2. Scroll down to **Build & Development Settings**
3. Click **Clear Build Cache** (if available)

### 3️⃣ Redeploy on Vercel

**Option A: Trigger from Vercel Dashboard**
- Go to **Deployments** tab
- Click the **three dots (...)** next to the latest deployment
- Click **Redeploy**
- ✅ Make sure "Use existing Build Cache" is **UNCHECKED**

**Option B: Push a new commit**
```bash
git add .
git commit -m "fix: update Supabase config for Vercel deployment"
git push
```

### 4️⃣ Test on Vercel

After deployment completes:
1. Open your Vercel deployment URL
2. Go to `/login`
3. Log in with your admin credentials
4. You should stay on the dashboard without redirect loop

### 5️⃣ If Still Having Issues

**Check Browser Console on Vercel:**
1. Open your deployed site
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for errors like:
   - "Missing Supabase environment variables"
   - "Auth state change event: SIGNED_OUT"
   - "No user session found"

**Common Issues:**

❌ **"Missing Supabase environment variables"**
- Solution: Environment variables not set in Vercel. Go back to Step 1.

❌ **Redirect loop continues**
- Solution: Clear browser cache and cookies for your Vercel domain
- Try in Incognito/Private browsing mode
- Check that all 4 environment variables are set for ALL environments

❌ **"Auth state change event: SIGNED_OUT" immediately after login**
- Solution: Supabase project URL mismatch. Verify the URL is exactly: `https://lxshgillxjohtideuugq.supabase.co`

❌ **"Invalid API key" errors**
- Solution: Wrong SUPABASE_SERVICE_ROLE_KEY. Copy it exactly from `.env.local`

### 6️⃣ Verify Your Supabase Database

Make sure your new Supabase project has the schema:
1. Go to: https://supabase.com/dashboard/project/lxshgillxjohtideuugq
2. Click **SQL Editor**
3. Run the `FRESH_SUPABASE_PROJECT_MIGRATION.sql` file (if not done already)

### 7️⃣ Create Admin User (if needed)

If you haven't created an admin user in the new Supabase project:
```bash
node create-admin-user.js
```

---

## ✅ What I Fixed in the Code

1. **Updated Supabase client configuration** (`src/lib/supabase/client.ts`)
   - Added proper session storage configuration
   - Added PKCE flow for better security
   - Added session detection in URL

2. **Enhanced auth context** (`src/lib/auth-context.tsx`)
   - Added better logging for debugging
   - Improved session restoration logic

3. **Updated Next.js config** (`next.config.js`)
   - Added new Supabase domain for images
   - Ensured environment variables are properly exposed

4. **Added Vercel configuration** (`vercel.json`)
   - Set proper region (Mumbai - bom1)
   - Configured environment variable references

5. **Fixed dashboard auth handling** (`src/app/(admin)/dashboard/page.tsx`)
   - Added token validation before API calls
   - Auto-redirect to login if token missing/expired
   - Clear invalid sessions properly

---

## 🔍 Debugging Tips

If you still face issues, check these in order:

1. **Vercel Deployment Logs**
   - Go to Deployments → Click on deployment → View Function Logs
   - Look for "Missing Supabase environment variables" errors

2. **Browser Console on Vercel**
   - Open deployed site → F12 → Console
   - Look for auth-related errors

3. **Supabase Dashboard**
   - Go to Authentication → Users
   - Verify your admin user exists

4. **Network Tab**
   - F12 → Network tab
   - Try logging in
   - Check if `/api/auth/login` returns 200 OK
   - Check if response includes `access_token`

---

## 📋 Checklist

- [ ] Deleted ALL old Supabase environment variables in Vercel
- [ ] Added all 4 new environment variables in Vercel
- [ ] Checked ALL THREE environments (Production, Preview, Development) for each variable
- [ ] Cleared Vercel build cache
- [ ] Redeployed with "Use existing Build Cache" UNCHECKED
- [ ] Verified database schema in new Supabase project
- [ ] Created admin user using create-admin-user.js
- [ ] Tested login on Vercel deployment
- [ ] Checked browser console for errors
- [ ] Cleared browser cache/cookies for Vercel domain

---

## 🎯 Expected Behavior After Fix

✅ Login on Vercel → Redirects to dashboard → Stays on dashboard
✅ Refresh page → Stays logged in
✅ All API calls work (attendance, leaves, stats)
✅ No redirect loop
✅ Same behavior as localhost
