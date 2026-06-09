# Deployment Guide

## ✅ Backend Deployment (Completed)

### Backend URL
```
https://attendence-backend-k951.onrender.com
```

### Configuration
- Platform: Render
- Build Command: `npm run build`
- Start Command: `npm start`
- Environment Variables: Set in Render dashboard
  - `DATABASE_URL` (Supabase connection)
  - `JWT_SECRET`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `PORT=5000`
  - `NODE_ENV=production`

### CORS Configuration
Backend is configured to allow frontend domain. Update `backend/.env` or Render environment variables with:
```
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

---

## 🚀 Frontend Deployment (Next Steps)

### 1. Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - Project name: attendence (or your choice)
# - Directory: ./ (root)
# - Override settings? No

# For production deployment
vercel --prod
```

#### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `next build`
   - Output Directory: `.next`
5. Add Environment Variables (see below)
6. Click "Deploy"

### 2. Environment Variables for Vercel

Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://olsgdfjgxgttpxkzudxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sc2dkZmpneGd0dHB4a3p1ZHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTYwOTgsImV4cCI6MjA5NTg3MjA5OH0.C_lIRdmCHfwpaRIJ0feRgVsuSayXRJ6795aM1Q7rmRc

# Backend API URL (IMPORTANT: Use production backend)
NEXT_PUBLIC_BACKEND_URL=https://attendence-backend-k951.onrender.com
NEXT_PUBLIC_API_URL=https://attendence-backend-k951.onrender.com/api/v1

# Server-side only (optional for API routes)
SUPABASE_URL=https://olsgdfjgxgttpxkzudxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sc2dkZmpneGd0dHB4a3p1ZHh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDI5NjA5OCwiZXhwIjoyMDk1ODcyMDk4fQ.xeQm_x6b2BDECvimGaxGbc-OP5vlujpQW0oARDOBrj0
```

**Note:** Mark `SUPABASE_SERVICE_ROLE_KEY` as "Sensitive" in Vercel to hide it from logs.

### 3. Update Backend CORS

After deployment, update the backend CORS configuration:

1. Go to Render dashboard
2. Select your backend service
3. Go to Environment → Environment Variables
4. Update `CORS_ORIGIN` to your Vercel URL:
   ```
   CORS_ORIGIN=https://your-app-name.vercel.app
   ```
5. Save and redeploy

### 4. Verify Deployment

1. **Check Build Logs**: Ensure no errors during build
2. **Test Authentication**: Try logging in
3. **Test API Calls**: Check browser console for 404/CORS errors
4. **Test Features**:
   - Create/edit boards
   - Drag and drop cards
   - Upload attachments
   - Add comments
   - Assign tasks

### 5. Common Issues & Solutions

#### CORS Errors
**Problem**: `Access-Control-Allow-Origin` errors in browser console
**Solution**: 
- Verify `CORS_ORIGIN` in backend includes your Vercel URL
- Check that URL doesn't have trailing slash
- Redeploy backend after changes

#### 404 on API Calls
**Problem**: API calls return 404
**Solution**:
- Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly in Vercel
- Check that backend is running (visit backend URL directly)
- Ensure environment variables are set for production environment

#### Build Failures
**Problem**: Deployment fails during build
**Solution**:
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Run `npm run build` locally to catch errors early

#### Backend Sleep (Render Free Tier)
**Problem**: First request takes 30+ seconds
**Solution**:
- Render free tier spins down after inactivity
- Consider upgrading to paid tier for always-on service
- Or implement a keep-alive ping service

---

## 📋 Deployment Checklist

### Pre-Deployment
- [x] Backend deployed to Render
- [x] Environment variables configured
- [x] All hardcoded URLs replaced with env vars
- [x] TypeScript compilation errors fixed
- [x] Test files excluded from build
- [ ] Local build succeeds (`npm run build`)

### Vercel Deployment
- [ ] Project created in Vercel
- [ ] Environment variables added
- [ ] First deployment succeeded
- [ ] Frontend loads without errors

### Post-Deployment
- [ ] Backend CORS updated with frontend URL
- [ ] Backend redeployed
- [ ] Authentication tested
- [ ] Board operations tested
- [ ] Task drag-and-drop tested
- [ ] File uploads tested
- [ ] All user roles tested (admin & employee)

### Custom Domain (Optional)
- [ ] Domain purchased
- [ ] DNS configured in Vercel
- [ ] SSL certificate auto-generated
- [ ] Backend CORS updated with custom domain

---

## 🔧 Maintenance

### Updating Frontend
```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin main

# Vercel will auto-deploy on push
```

### Updating Backend
```bash
cd backend
# Make changes
git add .
git commit -m "Your changes"
git push origin main

# Render will auto-deploy on push
```

### Monitoring
- **Frontend**: Vercel Dashboard → Analytics
- **Backend**: Render Dashboard → Logs
- **Database**: Supabase Dashboard → Database Stats

---

## 🆘 Support

If you encounter issues:
1. Check Vercel build logs
2. Check Render backend logs
3. Check browser console for errors
4. Verify all environment variables are set
5. Test API endpoints directly (Postman/curl)

---

## 📝 Notes

- Frontend is configured to fallback to `localhost:5000` for local development
- All fetch calls now use `NEXT_PUBLIC_BACKEND_URL` environment variable
- TypeScript configuration updated to fix deprecation warnings
- Test files excluded from production build
