# Install Google Drive Dependencies

## Backend Dependencies

Run this in the `backend` folder:

```bash
cd backend
npm install googleapis
```

## Environment Variables

Add these to `backend/.env`:

```env
# Google Drive OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# For production, change to:
# GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

## Get Google Credentials:

1. Go to: https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google Drive API:
   - Go to "APIs & Services" → "Library"
   - Search "Google Drive API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
5. Copy Client ID and Client Secret to `.env`

## OAuth Scopes Required:

The app will request these permissions:
- `https://www.googleapis.com/auth/drive` - Full Drive access
- `https://www.googleapis.com/auth/userinfo.email` - User's email

## Next Steps:

After installing and configuring, I'll create the backend routes and controllers.
