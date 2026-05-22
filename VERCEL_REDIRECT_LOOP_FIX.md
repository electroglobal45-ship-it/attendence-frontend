# 🔄 Vercel Redirect Loop Fix

## Problem
Login → Dashboard → Login → Dashboard (infinite loop) on Vercel, but works fine on localhost.

## Root Cause
Supabase session is not being saved/restored properly on Vercel. The auth context loads, sees no session, redirects to login. After login, session is created but immediately lost on page load.

## Quick Fix (Do This Now!)

### Step 1: Update Environment Variables in Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. **DELETE ALL OLD SUPABASE VARIABLES**
3. Add these 4 variables (copy exactly):

```
NEXT_PUBLIC_SUPABASE_URL=https://lxshgillxjohtideuugq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4c2hnaWxseGpvaHRpZGV1dWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDAxMDUsImV4cCI6MjA5NTAxNjEwNX0.rfiWSYF2DodiwDCFsxdgOC2lAlWyCmKMzV0pADxjFc0
SUPABASE_URL=https://lxshgillxjohtideuugq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4c2hnaWxseGpvaHRpZGV1dWdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ0MDEwNSwiZXhwIjoyMDk1MDE2MTA1fQ.EQgVBq86iVruzEAD8bJwpiloRp64w47--2IO08S4Xbw
```

4. **IMPORTANT**: For EACH variable, check ALL THREE boxes:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development

### Step 2: Clear Build Cache & Redeploy
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"
4. **UNCHECK** "Use existing Build Cache"
5. Click "Redeploy"

### Step 3: Test
1. Wait for deployment to complete
2. Open your Vercel URL
3. Go to `/login`
4. Log in
5. Should stay on dashboard ✅

## If Still Not Working

### Debug Step 1: Check Browser Console
1. Open your Vercel site
2. Press F12
3. Go to Console tab
4. Try to log in
5. Look for these messages:

**Good signs:**
```
✅ Auth successful, user ID: xxx
✅ Login successful: admin@example.com role: admin
Loading user from Supabase session...
User loaded successfully: admin@example.com role: admin
```

**Bad signs:**
```
❌ No user session found
Auth state change event: SIGNED_OUT
Missing Supabase environment variables
```

### Debug Step 2: Check Network Tab
1. F12 → Network tab
2. Try to log in
3. Find the `/api/auth/login` request
4. Check the response:
   - Should return status 200
   - Should have `access_token` in response
   - Should have `session` object

### Debug Step 3: Check Application Storage
1. F12 → Application tab (Chrome) or Storage tab (Firefox)
2. Look at Local Storage
3. Should see:
   - `supabase.auth.token` with a long JWT token
   - `authToken` with the same token
   - `user` with user profile JSON

If these are missing or empty → Session not being saved

### Debug Step 4: Check Vercel Logs
1. Vercel Dashboard → Deployments
2. Click on your deployment
3. Click "View Function Logs"
4. Look for errors during login/page load

## Common Issues & Solutions

### Issue 1: "Missing Supabase environment variables"
**Solution:** Environment variables not set in Vercel
- Go back to Step 1
- Make sure ALL 4 variables are added
- Make sure ALL 3 environments are checked

### Issue 2: Redirect loop continues
**Solution:** Clear browser cache
- Clear cache and cookies for your Vercel domain
- Try in Incognito/Private mode
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Issue 3: "Auth state change event: SIGNED_OUT" right after login
**Solution:** Supabase URL mismatch
- Verify the URL is EXACTLY: `https://lxshgillxjohtideuugq.supabase.co`
- No trailing slash
- No extra spaces
- Check both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`

### Issue 4: Works in Preview but not Production
**Solution:** Environment variables not set for Production
- Go to Vercel → Settings → Environment Variables
- For EACH variable, make sure "Production" is checked
- Redeploy to Production

### Issue 5: Session lost on page refresh
**Solution:** localStorage not persisting
- This is the code fix I already applied
- Make sure you deployed the latest code with the Supabase client updates
- Check that `vercel.json` file exists in your project

## What I Fixed in the Code

I've already updated these files to fix the session persistence issue:

1. ✅ `src/lib/supabase/client.ts` - Added proper session storage config
2. ✅ `src/lib/auth-context.tsx` - Added better session restoration
3. ✅ `next.config.js` - Added new Supabase domain
4. ✅ `vercel.json` - Added Vercel-specific configuration
5. ✅ `src/app/(admin)/dashboard/page.tsx` - Added token validation

**Now you just need to:**
1. Commit and push these changes
2. Update environment variables in Vercel
3. Redeploy

## Push the Code Changes

```bash
git add .
git commit -m "fix: Vercel session persistence and redirect loop"
git push
```

This will trigger a new deployment with all the fixes.

## Final Checklist

- [ ] Updated all 4 environment variables in Vercel
- [ ] Checked all 3 environments for each variable
- [ ] Deleted old Supabase variables
- [ ] Pushed latest code changes to git
- [ ] Cleared Vercel build cache
- [ ] Redeployed
- [ ] Tested login on Vercel
- [ ] Checked browser console for errors
- [ ] Verified session persists on page refresh

## Still Need Help?

If you've done all the above and it still doesn't work, check:

1. **Supabase Dashboard** → Authentication → URL Configuration
   - Make sure "Site URL" includes your Vercel domain
   - Add your Vercel domain to "Redirect URLs"

2. **Vercel Domain**
   - If using custom domain, make sure it's properly configured
   - Try with the default `.vercel.app` domain first

3. **Browser Issues**
   - Try different browser
   - Disable browser extensions
   - Check if third-party cookies are blocked
