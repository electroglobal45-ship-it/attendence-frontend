# Push Frontend to GitHub

## 📋 What Will Be Pushed
- ✅ All frontend code (`src/`, `public/`, etc.)
- ✅ Next.js configuration files
- ✅ Package.json and dependencies
- ✅ README and documentation
- ❌ **Backend folder (excluded)**
- ❌ node_modules
- ❌ .env.local (sensitive data)

---

## 🚀 Step-by-Step Commands

### 1. Initialize Git (if not already done)
```bash
git init
```

### 2. Set Remote URL
```bash
git remote set-url origin https://github.com/electroglobal45-ship-it/attendance-frontend.git
```

Or if remote doesn't exist:
```bash
git remote add origin https://github.com/electroglobal45-ship-it/attendance-frontend.git
```

### 3. Check What Will Be Pushed
```bash
git status
```

**Important:** Make sure you DON'T see `backend/` in the list!

### 4. Add All Files
```bash
git add .
```

### 5. Commit
```bash
git commit -m "Frontend ready for deployment - backend excluded"
```

### 6. Push to GitHub
```bash
git push -u origin main
```

**Or if your branch is named `master`:**
```bash
git push -u origin master
```

---

## ⚠️ If You Get Errors

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/electroglobal45-ship-it/attendance-frontend.git
```

### Error: "failed to push some refs"
```bash
# Pull first, then push
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### Error: "src refspec main does not match any"
Your branch might be named `master` instead of `main`:
```bash
git branch -M main
git push -u origin main
```

---

## ✅ Verify Backend is NOT Pushed

After pushing, go to GitHub:
1. Visit: https://github.com/electroglobal45-ship-it/attendance-frontend
2. Check the file list
3. **Verify:** You should NOT see a `backend/` folder
4. **You should see:** `src/`, `public/`, `package.json`, etc.

---

## 🔄 After Pushing to GitHub

### Deploy to Vercel via GitHub

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select: `electroglobal45-ship-it/attendance-frontend`
4. Vercel will auto-detect Next.js
5. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_BACKEND_URL=https://attendence-backend-k951.onrender.com
   NEXT_PUBLIC_API_URL=https://attendence-backend-k951.onrender.com/api/v1
   NEXT_PUBLIC_SUPABASE_URL=https://olsgdfjgxgttpxkzudxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sc2dkZmpneGd0dHB4a3p1ZHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTYwOTgsImV4cCI6MjA5NTg3MjA5OH0.C_lIRdmCHfwpaRIJ0feRgVsuSayXRJ6795aM1Q7rmRc
   ```
6. Click **Deploy**

---

## 🔄 Future Updates

Every time you make changes to the frontend:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

Vercel will automatically redeploy your frontend!

---

## 📝 Notes

- `.gitignore` now excludes the `backend/` folder
- `.env.local` is also excluded (contains sensitive data)
- Your backend remains deployed separately on Render
- Frontend and backend are now in separate repositories

---

## 🎯 Complete Deployment Flow

1. **Backend:** Already deployed to Render ✅
2. **Frontend Code:** Push to GitHub (this guide) 
3. **Frontend Hosting:** Deploy to Vercel from GitHub
4. **CORS Update:** Add Vercel URL to backend CORS_ORIGIN
5. **Test:** Visit Vercel URL and test all features

You're on step 2 right now! 🚀
