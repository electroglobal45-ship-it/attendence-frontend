# Environment Setup Guide

This guide explains how to switch between **development (localhost)** and **production** environments.

---

## 🔧 Quick Switch Instructions

### For Development (localhost)
1. Open `.env.local`
2. **Uncomment** the localhost lines:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
   ```
3. **Comment** the production lines:
   ```env
   # NEXT_PUBLIC_BACKEND_URL=https://attendence-backend-k951.onrender.com
   # NEXT_PUBLIC_API_URL=https://attendence-backend-k951.onrender.com/api/v1
   ```
4. Restart your Next.js dev server

### For Production (Render)
1. Open `.env.local`
2. **Comment** the localhost lines:
   ```env
   # NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   # NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
   ```
3. **Uncomment** the production lines:
   ```env
   NEXT_PUBLIC_BACKEND_URL=https://attendence-backend-k951.onrender.com
   NEXT_PUBLIC_API_URL=https://attendence-backend-k951.onrender.com/api/v1
   ```
4. Rebuild and deploy

---

## 🚀 Development Workflow

### Running Locally
1. **Backend (Terminal 1)**:
   ```bash
   cd backend
   npm run dev
   ```
   Backend runs on: `http://localhost:5000`

2. **Frontend (Terminal 2)**:
   ```bash
   npm run dev
   ```
   Frontend runs on: `http://localhost:3000`

3. Make sure `.env.local` is set to **localhost** configuration

### Testing Production Backend Locally
If you want to test with the production backend while developing frontend:
1. Set `.env.local` to **production** configuration
2. Only run frontend locally:
   ```bash
   npm run dev
   ```
3. Frontend will connect to production backend on Render

---

## 📝 Important Notes

### After Changing .env.local
Always restart your Next.js dev server for environment variable changes to take effect:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Vercel Deployment
When deploying to Vercel, you don't need to modify `.env.local`. Instead, set environment variables in Vercel dashboard:
- Go to: Project Settings → Environment Variables
- Add:
  - `NEXT_PUBLIC_BACKEND_URL` = `https://attendence-backend-k951.onrender.com`
  - `NEXT_PUBLIC_API_URL` = `https://attendence-backend-k951.onrender.com/api/v1`

### Git and .env.local
⚠️ **SECURITY**: Never commit `.env.local` with real credentials to GitHub!
- `.env.local` is already in `.gitignore`
- Keep your Supabase keys secure
- Only share environment variables through secure channels

---

## 🔍 Current Configuration

Check your current backend URL:
```bash
# Windows CMD
echo %NEXT_PUBLIC_BACKEND_URL%

# Windows PowerShell
echo $env:NEXT_PUBLIC_BACKEND_URL

# Or check in browser console:
console.log(process.env.NEXT_PUBLIC_BACKEND_URL)
```

---

## ✅ Environment Checklist

Before starting development:
- [ ] Backend is running (if using localhost)
- [ ] `.env.local` has correct backend URL
- [ ] Frontend dev server is restarted after .env changes
- [ ] Can access frontend at `http://localhost:3000`
- [ ] API calls are working (check browser Network tab)

Before deploying:
- [ ] Backend is deployed to Render
- [ ] Frontend `.env.local` is set to production (or Vercel env vars are set)
- [ ] All features tested with production backend
- [ ] Database migrations are applied
- [ ] Supabase storage is configured

---

## 🆘 Troubleshooting

### Frontend can't connect to backend
1. Check if backend is running (visit backend URL in browser)
2. Check `.env.local` has correct URL
3. Restart frontend dev server
4. Check browser console for CORS errors

### Environment variables not updating
1. Stop dev server completely (Ctrl+C)
2. Clear Next.js cache: `del /s /q .next` (Windows CMD)
3. Restart: `npm run dev`

### CORS errors
- For localhost: Backend should allow `http://localhost:3000`
- For production: Backend should allow your Vercel domain
- Check `backend/src/app.ts` CORS configuration
