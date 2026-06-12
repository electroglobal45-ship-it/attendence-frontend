# How Google Drive API Works

## Architecture

```
User Browser → Next.js Frontend (Port 3000) → Express Backend (Port 5000) → Google Drive API
                                                      ↓
                                               Supabase Database
                                             (stores OAuth tokens)
```

## Connection Flow

### How API is Connected

1. **You (Admin)** create OAuth credentials in Google Cloud Console
2. Add Client ID + Client Secret to `backend/.env`
3. Backend uses `googleapis` npm package to communicate with Google Drive
4. OAuth 2.0 handles authentication and authorization

### How Users Connect Their Drive

**Step 1:** User clicks "Drive" in sidebar
- Goes to `/drive` page
- Page checks if user's Google Drive is connected
- Shows "Connect with Google" button if not connected

**Step 2:** User clicks "Connect with Google"
- Frontend calls: `driveAPI.getAuthUrl()`
- Backend generates Google OAuth URL
- Redirects user to Google's login page

**Step 3:** User logs into Google
- Google asks: "Allow this app to access your Drive?"
- User clicks "Allow"
- Google redirects back to: `http://localhost:5000/api/v1/drive/auth/callback?code=XXXXX`

**Step 4:** Backend exchanges code for tokens
- Receives authorization code from Google
- Exchanges code for access_token + refresh_token
- Saves tokens to `google_drive_tokens` table in Supabase
- Links tokens to user's ID

**Step 5:** User redirected to Drive page
- Now shows "Connected" status
- Can upload, download, share files
- All file operations use saved tokens

## Token Management

- **Access Token**: Expires every 1 hour
- **Refresh Token**: Never expires (unless revoked)
- Backend automatically refreshes expired tokens
- No user action needed

## Each User's Own Drive

- Every user connects their **personal** Google Drive account
- Files are stored in **their** Google Drive (not a shared company drive)
- Sharing happens via Google Drive's native sharing + our tracking system

## Security

- OAuth tokens stored encrypted in database
- Each user can only access their own tokens
- RLS (Row Level Security) prevents cross-user access
- Tokens can be revoked anytime via "Disconnect" button

## What Users Can Do After Connecting

1. **Upload** files from portal → saved to their Google Drive
2. **Download** files from their Drive to local computer
3. **Share** with other employees (internally tracked)
4. **View** files shared by others
5. **Edit** files directly in Google Drive (opens in new tab)
6. **Delete** files from their Drive

## Private Sharing System

- User A shares file with User B
- Creates entry in `drive_shares` table
- Only User A and User B can see this share in the portal
- File permissions added in Google Drive (so User B can actually access it)
- If User A revokes, both portal entry and Google permission deleted
