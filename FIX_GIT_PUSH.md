# Fix Git Push Permission Error

## Problem
```
remote: Permission to Ajay1102-max/crm-attendence.git denied to electroglobal26.
fatal: unable to access 'https://github.com/Ajay1102-max/crm-attendence.git/': The requested URL returned error: 403
```

Git is using the wrong GitHub account credentials.

## Solution Options

### Option 1: Use Personal Access Token (Recommended)

1. **Create a Personal Access Token on GitHub:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a name: "CRM Attendance Deploy"
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token"
   - **COPY THE TOKEN** (you won't see it again!)

2. **Update Git Remote URL with Token:**
   ```bash
   git remote set-url origin https://<YOUR_TOKEN>@github.com/Ajay1102-max/crm-attendence.git
   ```
   
   Replace `<YOUR_TOKEN>` with the token you just copied.

3. **Push Again:**
   ```bash
   git push -u origin main
   ```

### Option 2: Use SSH (More Secure)

1. **Generate SSH Key (if you don't have one):**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
   Press Enter to accept default location, optionally add a passphrase.

2. **Copy SSH Public Key:**
   ```bash
   type %USERPROFILE%\.ssh\id_ed25519.pub
   ```
   Copy the entire output.

3. **Add SSH Key to GitHub:**
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste your public key
   - Click "Add SSH key"

4. **Change Remote URL to SSH:**
   ```bash
   git remote set-url origin git@github.com:Ajay1102-max/crm-attendence.git
   ```

5. **Push Again:**
   ```bash
   git push -u origin main
   ```

### Option 3: Clear Cached Credentials

If you want to re-enter credentials:

```bash
git credential-manager delete https://github.com
git push -u origin main
```

This will prompt you to enter your GitHub username and password (or token).

## Verify Remote URL

Check your current remote URL:
```bash
git remote -v
```

Should show:
```
origin  https://github.com/Ajay1102-max/crm-attendence.git (fetch)
origin  https://github.com/Ajay1102-max/crm-attendence.git (push)
```

## After Successful Push

Once the push succeeds, you can proceed with Vercel deployment:

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository: `Ajay1102-max/crm-attendence`
4. Add environment variables
5. Deploy!

---

## Quick Fix (Recommended)

**Use Personal Access Token - Fastest Solution:**

```bash
# 1. Create token at: https://github.com/settings/tokens
# 2. Update remote URL:
git remote set-url origin https://YOUR_TOKEN_HERE@github.com/Ajay1102-max/crm-attendence.git

# 3. Push:
git push -u origin main
```

Replace `YOUR_TOKEN_HERE` with your actual token.
