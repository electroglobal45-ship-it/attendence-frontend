# Deploy Frontend to Vercel (Without Backend)

## 🚀 Quick Deployment Steps

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy from Project Root
```bash
# Navigate to your project directory
cd C:\Users\DELL\Desktop\Attendence

# Deploy (first time)
vercel

# For production deployment
vercel --prod
```

**Note:** Vercel will automatically detect Next.js and only deploy the frontend. The backend folder will be ignored.

---

## ⚙️ Add Environment Variables in Vercel

After deployment, go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these variables for **Production, Preview, and Development**:

### Required Variables:
```
NEXT_PUBLIC_BACKEND_URL=https://attendence-backend-k951.onrender.com
NEXT_PUBLIC_API_URL=https://attendence-backend-k951.onrender.com/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://olsgdfjgxgttpxkzudxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sc2dkZmpneGd0dHB4a3p1ZHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTYwOTgsImV4cCI6MjA5NTg3MjA5OH0.C_lIRdmCHfwpaRIJ0feRgVsuSayXRJ6795aM1Q7rmRc
```

### Optional (Server-side only):
```
SUPABASE_URL=https://olsgdfjgxgttpxkzudxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sc2dkZmpneGd0dHB4a3p1ZHh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDI5NjA5OCwiZXhwIjoyMDk1ODcyMDk4fQ.xeQm_x6b2BDECvimGaxGbc-OP5vlujpQW0oARDOBrj0
```

Mark `SUPABASE_SERVICE_ROLE_KEY` as **Sensitive**.

---

## 🔄 After Adding Environment Variables

Redeploy to apply the new environment variables:
```bash
vercel --prod
```

---

## ✅ Update Backend CORS

Once your Vercel URL is live (e.g., `https://your-app.vercel.app`):

1. Go to **Render Dashboard**
2. Select your backend service: `attendence-backend`
3. **Environment** → **Environment Variables**
4. Add/Update:
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   ```
5. **Save Changes** (backend will auto-redeploy)

---

## 📝 What Gets Deployed to Vercel

### ✅ Included:
- All frontend code (`src/` folder)
- Next.js configuration
- Public assets
- Environment variables (set in dashboard)

### ❌ Excluded (Automatically):
- `backend/` folder
- `node_modules/`
- `.next/`
- `.git/`
- Any files in `.gitignore`

**Vercel only builds and deploys the Next.js frontend.**

---

## 🎯 Alternative: Deploy via GitHub

If you prefer automatic deployments:

### 1. Create .gitignore (if not exists)
Make sure `backend/` is listed in your `.gitignore`:
```
backend/
node_modules/
.next/
.env.local
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Frontend ready for deployment"
git push origin main
```

### 3. Import to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository**
3. Select your repository
4. Vercel auto-detects Next.js
5. Add environment variables
6. Click **Deploy**

**Note:** Backend folder won't be pushed if it's in `.gitignore`.

---

## 🔍 Verify Deployment

### 1. Check Build Logs
- Vercel Dashboard → Deployments → View Logs
- Ensure no errors

### 2. Test Your App
Visit your Vercel URL and test:
- ✅ Login (admin & employee)
- ✅ View boards
- ✅ Drag and drop cards
- ✅ Upload files
- ✅ Add comments

### 3. Check Browser Console
- Open DevTools (F12)
- Look for CORS or 404 errors
- Verify API calls go to Render backend

---

## ⚠️ Troubleshooting

### Build Warnings (Safe to Ignore)
ESLint warnings won't prevent deployment:
- Missing dependencies in useEffect
- Using `<img>` instead of `<Image>`

### CORS Errors
**Solution:** Update backend `CORS_ORIGIN` with your Vercel URL

### API 404 Errors
**Solution:** Verify environment variables are set in Vercel Dashboard

### Build Timeout
**Solution:** Vercel has a build timeout of 15 minutes (free tier). If it times out:
1. Check build logs for errors
2. Optimize large dependencies
3. Consider upgrading Vercel plan

---

## 📊 Post-Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] Environment variables added in Vercel
- [ ] Backend CORS updated with Vercel URL
- [ ] Login tested (admin + employee)
- [ ] Board operations work
- [ ] Drag and drop works
- [ ] File uploads work
- [ ] No console errors

---

## 🎉 You're Done!

Your frontend is now deployed and connected to your Render backend.

**Frontend:** `https://your-app.vercel.app`  
**Backend:** `https://attendence-backend-k951.onrender.com`

Every push to your main branch will trigger automatic redeployment on Vercel (if using GitHub integration).
