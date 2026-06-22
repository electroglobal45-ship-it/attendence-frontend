# 🔐 Frontend Security Guide — Production Deployment

> **Specific to:** Next.js 14 App Router · Supabase · Express Backend · Google Drive OAuth  
> **Last updated:** June 2026

---

## 1. Environment Variables & Secrets

### ✅ What to do

| Variable | Where it lives | Risk if exposed |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-visible (safe — Anon key is public by design) | Low — protected by Supabase RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (never prefix with `NEXT_PUBLIC_`) | **CRITICAL** — bypasses ALL RLS |
| `GOOGLE_CLIENT_SECRET` | Server-only (never prefix with `NEXT_PUBLIC_`) | **CRITICAL** — OAuth hijack possible |
| `GOOGLE_CLIENT_ID` | Server-only OK (not sensitive but keep private) | Medium |
| `GOOGLE_REDIRECT_URI` | Server-only | Low — but must match exactly |

### ⚠️ Issues to fix

1. **`GOOGLE_CLIENT_SECRET` and `GOOGLE_CLIENT_ID` are currently in `.env.local`** which is fine locally, but on Vercel you must add them as **Environment Variables in the Vercel Dashboard**, not in any committed file.

2. **`SUPABASE_SERVICE_ROLE_KEY` must NEVER appear in any file that is committed to git.** Verify your `.gitignore` includes `.env.local`.

3. **Do NOT add `NEXT_PUBLIC_` prefix to:**
   - `GOOGLE_CLIENT_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Any future API keys or secrets

### 📋 Vercel Dashboard — Required env vars to set manually
Go to **Vercel → Project → Settings → Environment Variables** and add:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_BACKEND_URL
NEXT_PUBLIC_API_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
```

---

## 2. Authentication Cookies — Critical Fix Needed

### ⚠️ Current state (insecure for production)

In [`auth-context.tsx`](./src/lib/auth-context.tsx) and [`backend-api.ts`](./src/lib/backend-api.ts), cookies are set like this:

```js
// CURRENT (insecure)
document.cookie = `authToken=${result.token}; path=/; max-age=604800; SameSite=Lax`
document.cookie = `userRole=${result.user.role}; path=/; max-age=604800; SameSite=Lax`
```

### ✅ What you MUST change for production

Add the `Secure` flag so cookies are only sent over HTTPS:

```js
// PRODUCTION (secure)
document.cookie = `authToken=${result.token}; path=/; max-age=604800; SameSite=Lax; Secure`
document.cookie = `userRole=${result.user.role}; path=/; max-age=604800; SameSite=Lax; Secure`
```

**Files to update** (same cookie string appears in multiple places):
- [`src/lib/auth-context.tsx`](./src/lib/auth-context.tsx) — lines ~224–225, ~260–261, ~174–175
- [`src/lib/backend-api.ts`](./src/lib/backend-api.ts) — lines ~83, ~124, ~134–135

> **Why?** Without `Secure`, cookies can be sent over plain HTTP connections, allowing man-in-the-middle attacks. On HTTPS-only Vercel deployments this is essential.

### ✅ Recommended approach — use a helper function

Create one place that always applies all flags consistently:

```ts
// src/lib/cookie-utils.ts
export function setSecureCookie(name: string, value: string, maxAge = 604800) {
  const isProduction = process.env.NODE_ENV === 'production'
  const secureFlag = isProduction ? '; Secure' : ''
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`
}

export function clearCookie(name: string) {
  const isProduction = process.env.NODE_ENV === 'production'
  const secureFlag = isProduction ? '; Secure' : ''
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secureFlag}`
}
```

---

## 3. HTTP Security Headers — Add to next.config.js

Your [`next.config.js`](./next.config.js) already has `poweredByHeader: false` (good ✅).  
Now add these security headers:

```js
// Add this to next.config.js inside nextConfig object
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        // Prevent clickjacking — stops your app being embedded in iframes
        { key: 'X-Frame-Options', value: 'DENY' },
        // Prevent MIME type sniffing
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        // Force HTTPS for 1 year
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        // Control what browser features are allowed
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        // Referrer policy — don't leak URLs to third parties
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // Content Security Policy (CSP) — MOST IMPORTANT
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed by Next.js
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://lxshgillxjohtideuugq.supabase.co https://coqpvdpkrthiwessgurq.supabase.co",
            "connect-src 'self' https://attendence-backend-k951.onrender.com https://*.supabase.co wss://*.supabase.co",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
      ],
    },
  ]
},
```

> **Note on CSP**: The `'unsafe-inline'` and `'unsafe-eval'` for scripts are required by Next.js in production. This is a known trade-off; do not remove them or the app will break.

---

## 4. Google Drive OAuth — State Parameter Security

### ⚠️ Current state

In [`src/app/api/drive/callback/route.ts`](./src/app/api/drive/callback/route.ts), the `state` parameter is used directly as `userId` without any CSRF/PKCE verification:

```ts
const state = searchParams.get('state') // userId — trusts this blindly
```

### ✅ What to improve

The `state` parameter should be a **random CSRF token**, not just the userId, to prevent OAuth CSRF attacks. The backend should:
1. When initiating OAuth, generate a random `state` token and store it (in session/DB) mapped to the userId.
2. When the callback arrives, verify the `state` token matches what was stored before processing.

This is a backend-level fix but coordinate it with your frontend callback route.

---

## 5. Sensitive Data in localStorage — Risk Awareness

### ⚠️ Current state

In [`auth-context.tsx`](./src/lib/auth-context.tsx) and [`backend-api.ts`](./src/lib/backend-api.ts):

```ts
localStorage.setItem('auth_token', token)      // JWT stored here
localStorage.setItem('user', JSON.stringify(user))  // User data stored here
localStorage.setItem('userRole', role)          // Role stored here
```

### ℹ️ Risk level: Medium

- `localStorage` is accessible to any JavaScript on the page (XSS risk).
- If your CSP (section 3) is set correctly, XSS risk is significantly reduced.
- The JWT in localStorage is a known trade-off; this is acceptable **if CSP is implemented**.

### ✅ Keep as-is but ensure:
- CSP headers (Section 3) are added — this is your primary defense.
- `console.log` statements that print tokens or user data are removed in production (already handled by `removeConsole` in `next.config.js` ✅).

---

## 6. Role-Based Access Control — Middleware Hardening

### ✅ Current state (good)
[`src/middleware.ts`](./src/middleware.ts) correctly blocks routes by role — this is the right approach.

### ⚠️ Weakness: Role stored in an unprotected cookie

```ts
const userRole = request.cookies.get('userRole')?.value  // middleware trusts this
```

`userRole` is stored in a plain cookie that a user can manually edit in DevTools to escalate their role (e.g., change `employee` to `admin`).

### ✅ Fix options (pick one)

**Option A (Simpler):** Decode the role from the JWT itself in middleware (don't trust a separate cookie):

```ts
// In middleware.ts, decode role from the JWT instead of userRole cookie
function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role || null
  } catch {
    return null
  }
}

// Then use:
const userRole = token ? getRoleFromToken(token) : null
```

**Option B:** Keep as-is — the backend still validates the JWT on every API call. The middleware role check only affects what pages load in the browser, not what data is accessible. The real security gate is the backend.

> **Recommendation:** Option A is better for production since it removes the ability for users to trick the middleware.

---

## 7. API Route Security

### ✅ Check each Next.js API route has auth validation

All routes under `/src/app/api/` that access sensitive data should verify the user's auth token before processing. Review these routes specifically:

| Route | Sensitive? | Auth check needed? |
|---|---|---|
| `/api/drive/callback` | Yes | Verify state/CSRF token |
| `/api/drive/auth` | Yes | Verify user is logged in |
| `/api/upload-selfie` | Yes | Verify JWT |
| `/api/salary` | Yes | Verify JWT + role |
| `/api/admin/*` | Yes | Verify JWT + admin role |
| `/api/export` | Yes | Verify JWT |

---

## 8. Image Domains — Whitelist Only What's Needed

In [`next.config.js`](./next.config.js):

```js
images: {
  domains: ['lxshgillxjohtideuugq.supabase.co', 'coqpvdpkrthiwessgurq.supabase.co'],
}
```

✅ This is correctly scoped. Do **not** add `*` wildcards here.

---

## 9. .gitignore Verification

Make sure these are in your [`.gitignore`](./.gitignore):

```gitignore
# Environment files — MUST be ignored
.env
.env.local
.env.production
.env.development.local
.env.test.local
.env.production.local

# Build output
.next/
dist/
```

Run this to verify nothing secret is tracked by git:
```bash
git ls-files | grep -E "\.env"
```
If any `.env` file appears, remove it with `git rm --cached .env.local`.

---

## 10. Quick Pre-Deployment Checklist

Before going live, verify each item:

- [ ] All env vars set in **Vercel Dashboard** (not committed to git)
- [ ] `.env.local` is in `.gitignore` and NOT pushed to GitHub
- [ ] `NEXT_PUBLIC_BACKEND_URL` points to Render URL (not localhost)
- [ ] `GOOGLE_REDIRECT_URI` in `.env.local` points to your Vercel domain
- [ ] Cookie `Secure` flag added to all `document.cookie` calls
- [ ] Security headers added to `next.config.js`
- [ ] Google OAuth Console has production URLs added as authorized origins/redirects
- [ ] `NODE_ENV=production` on the backend (Render)
- [ ] `CORS_ORIGIN` on the backend points to your Vercel domain
- [ ] No hardcoded secrets or API keys in source code (search: `grep -r "GOCSPX" ./src`)

---

## Priority Order (Do These First)

| Priority | Item | Effort |
|---|---|---|
| 🔴 P0 | Add `Secure` flag to all auth cookies | 10 min |
| 🔴 P0 | Set all secrets in Vercel Dashboard | 5 min |
| 🔴 P0 | Verify `.env.local` is not in git | 2 min |
| 🟠 P1 | Add security headers to `next.config.js` | 15 min |
| 🟠 P1 | Read role from JWT in middleware (not cookie) | 20 min |
| 🟡 P2 | Add CSRF state validation to Drive OAuth callback | 30 min |
| 🟢 P3 | Create `cookie-utils.ts` helper | 10 min |
