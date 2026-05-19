# Force Vercel to Redeploy with Fresh Build

## Problem
Vercel is serving cached version of the app. Mobile devices are not seeing the new changes.

## Solution: Force Fresh Deployment

### Step 1: Clear Vercel Build Cache

Go to your Vercel dashboard:
1. Open https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **General**
4. Scroll down to **Build & Development Settings**
5. Click **Clear Build Cache**

### Step 2: Trigger New Deployment

**Option A: Redeploy from Vercel Dashboard**
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click the **⋯** (three dots) menu
4. Click **Redeploy**
5. Make sure "Use existing Build Cache" is **UNCHECKED**
6. Click **Redeploy**

**Option B: Push a Small Change**
```bash
# Make a small change to force rebuild
echo "# Force rebuild" >> README.md
git add README.md
git commit -m "Force rebuild - clear cache"
git push origin main
```

### Step 3: Clear Mobile Browser Cache

**On iPhone (Safari):**
1. Open Settings app
2. Scroll down to Safari
3. Tap "Clear History and Website Data"
4. Confirm

**On iPhone (Chrome):**
1. Open Chrome app
2. Tap ⋯ (three dots) → Settings
3. Tap "Privacy and Security"
4. Tap "Clear Browsing Data"
5. Select "Cached images and files"
6. Tap "Clear Browsing Data"

**On Android (Chrome):**
1. Open Chrome app
2. Tap ⋯ (three dots) → Settings
3. Tap "Privacy and security"
4. Tap "Clear browsing data"
5. Select "Cached images and files"
6. Tap "Clear data"

### Step 4: Hard Refresh on Mobile

**iPhone Safari:**
- Pull down to refresh while holding the refresh button
- Or close all Safari tabs and reopen

**Chrome (any device):**
- Open the page
- Tap ⋯ menu → Settings → Site settings
- Tap "Clear & reset"

### Step 5: Verify Deployment

Check Vercel deployment logs:
1. Go to Vercel dashboard → Deployments
2. Click on the latest deployment
3. Check the **Build Logs** to ensure it rebuilt
4. Look for: "Building..." and "Deployment Complete"
5. Check the deployment URL is updated

### Step 6: Test with Incognito/Private Mode

**iPhone Safari:**
- Tap the tabs icon → Private → Open new private tab
- Visit your site

**Chrome:**
- Tap ⋯ → New Incognito Tab
- Visit your site

This bypasses all caches and shows the fresh version.

## Quick Test Commands

Run these to verify your local files are correct:

```bash
# Check if mobile classes exist in attendance page
type "src\app\(employee)\attendance\page.tsx" | findstr "px-4 sm:px-0"

# Check if validation exists
type "src\app\(employee)\attendance\page.tsx" | findstr "Please capture your selfie"

# Check if layout has mobile viewport
type "src\app\layout.tsx" | findstr "viewport"
```

## Alternative: Add Cache-Busting

If the problem persists, add this to `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['coqpvdpkrthiwessgurq.supabase.co'],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Force fresh builds
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  // Disable caching during development
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig
```

Then commit and push:
```bash
git add next.config.js
git commit -m "Add cache busting"
git push origin main
```

## Verify Changes Are Live

Visit your Vercel URL and check:
1. Open DevTools on mobile (if possible)
2. Check the HTML source - look for `px-4 sm:px-0` classes
3. Try the attendance page - validation should work
4. Check if viewport meta tag is present in `<head>`

## Still Not Working?

If changes still don't appear:

1. **Check Vercel Environment Variables**
   - Make sure all env vars are set correctly
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - JWT_SECRET

2. **Check Build Logs for Errors**
   - Look for any build failures
   - Check if all dependencies installed

3. **Try Different Device**
   - Test on a different phone
   - Test on desktop browser in mobile mode (F12 → Toggle device toolbar)

4. **Check Deployment URL**
   - Make sure you're visiting the correct URL
   - Check if you have multiple deployments

## Expected Results After Fix

✅ Mobile pages should have proper padding
✅ Attendance page should require both selfie AND GPS
✅ Buttons should be larger and touch-friendly
✅ Text should be readable on mobile
✅ No horizontal scrolling
✅ Forms should be easy to use on mobile
