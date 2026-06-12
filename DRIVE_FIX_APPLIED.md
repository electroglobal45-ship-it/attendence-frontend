# Google Drive Connection Fix Applied

## Issues Fixed

1. **Token Expiry Calculation Error**
   - Was incorrectly using `setSeconds()` with milliseconds timestamp
   - Now properly converts `tokens.expiry_date` (milliseconds) to Date object
   - Default 1 hour expiry if not provided

2. **Missing `connected_at` Timestamp**
   - OAuth callback wasn't setting `connected_at` on initial connection
   - Now explicitly sets it on both insert and update

3. **Added Debug Logging**
   - Connection status checks now log detailed information
   - Callback logs success/failure
   - Helps identify issues quickly

## What You Need to Do Now

### Step 1: Restart Next.js
The server needs to reload with the fixed code:
```bash
# Press Ctrl+C in the terminal running Next.js
# Then restart:
npm run dev
```

### Step 2: Clear Your Browser Storage (Optional but Recommended)
Open DevTools (F12) → Application → Storage → Clear site data

### Step 3: Test the Connection
1. Go to http://localhost:3000/drive
2. Click "Connect with Google"
3. Complete OAuth flow
4. After redirect, check browser console for logs like:
   ```
   [Drive Callback] Received: { hasCode: true, userId: "xxx" }
   [Drive Callback] Success: { email: "your@email.com" }
   [Drive] Connection status check: { userId: "xxx", hasData: true, error: null }
   [Drive] Token check: { tokenExpiry: "...", now: "...", isExpired: false, email: "..." }
   ```

### Step 4: Check Network Tab
In DevTools Network tab, check `/api/drive/auth/status` response:
- ✅ Should now return: `{"connected": true, "email": "your@email.com", "connectedAt": "..."}`
- ❌ If still `{"connected": false}`, check console logs

## Troubleshooting

If still showing "Connect Google Drive" after OAuth:

1. **Check Server Console Logs** - Look for the `[Drive]` prefixed logs
2. **Verify Database** - Run in Supabase SQL Editor:
   ```sql
   SELECT user_id, google_email, token_expiry, connected_at, 
          token_expiry > NOW() as is_valid
   FROM google_drive_tokens;
   ```
3. **Check Browser Console** - Look for API errors
4. **Try Manual Status Check** - Open DevTools Console and run:
   ```javascript
   fetch('/api/drive/auth/status', {
     headers: { Authorization: 'Bearer ' + localStorage.getItem('authToken') }
   }).then(r => r.json()).then(console.log)
   ```

## Expected Behavior

- ✅ OAuth completes → Redirects to `/drive?connected=true`
- ✅ Token saved to database with correct expiry
- ✅ Status API returns `connected: true`
- ✅ Page shows "My Drive" interface with Upload/New Folder buttons
- ✅ Can upload files, create folders, share with employees
