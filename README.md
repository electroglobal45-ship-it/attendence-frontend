# CRM Attendance System

A modern, GPS-enabled attendance and leave management system built with Next.js 14, Supabase, and TypeScript.

## Features

### For Employees
- 📸 **Selfie-based Attendance** - Mark attendance with selfie verification
- 📍 **GPS Verification** - Location-based check-in/check-out within office radius
- 🏖️ **Leave Management** - Apply for full-day, half-day, and short leaves
- 📅 **Calendar View** - View attendance history and leave status
- 💰 **Salary Tracking** - View monthly salary calculations based on attendance

### For Admins
- 👥 **Employee Management** - Create and manage employee accounts
- 📊 **Dashboard** - Real-time attendance statistics and pending requests
- ✅ **Leave Approval** - Approve or reject leave requests
- 📍 **Office Location** - Configure office GPS coordinates and radius
- 🎉 **Holiday Management** - Set company holidays
- 📈 **Reports** - Generate attendance and salary reports

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for selfies)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Attendence
npm install
```

### 2. Set Up Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Wait for the project to be ready

### 3. Run Database Migration

1. Go to your Supabase project → **SQL Editor**
2. Copy the contents of `FRESH_SUPABASE_PROJECT_MIGRATION.sql`
3. Paste and run the SQL script
4. This will create all tables, policies, and storage buckets

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Server-side only (for API routes with admin privileges)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Where to find these values:**
- Go to Supabase Dashboard → Project Settings → API
- Copy the Project URL and keys

### 5. Create Admin User

Run the admin user creation script:

```bash
node create-admin-user.js
```

Follow the prompts to create your admin account.

### 6. Configure Office Location

1. Start the dev server: `npm run dev`
2. Log in with your admin account
3. Go to **Settings** → **Office Location**
4. Enter your office GPS coordinates and radius
5. Save

**How to get GPS coordinates:**
- Open Google Maps
- Right-click on your office location
- Click the coordinates to copy them

### 7. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click **New Project**
3. Import your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**

### 3. Configure Supabase for Production

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel domain to **Site URL**
3. Add your Vercel domain to **Redirect URLs**

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (admin)/           # Admin routes (dashboard, employees, etc.)
│   │   ├── (employee)/        # Employee routes (attendance, leaves, etc.)
│   │   ├── (auth)/            # Authentication routes (login)
│   │   └── api/               # API routes
│   ├── components/            # React components
│   ├── lib/                   # Utilities and helpers
│   │   ├── supabase/         # Supabase client and auth
│   │   ├── date-utils.ts     # Date/time utilities
│   │   └── supabase-auth-helper.ts  # Auth middleware
│   └── styles/               # Global styles
├── public/                    # Static assets
├── FRESH_SUPABASE_PROJECT_MIGRATION.sql  # Database schema
├── create-admin-user.js      # Admin user creation script
└── README.md                 # This file
```

## Key Features Explained

### Attendance System
- **Check-in**: 9:00 AM - 9:05 AM (On time)
- **Late Buffer**: 9:05 AM - 9:30 AM (Marked late but full attendance)
- **Half Day**: After 9:30 AM (0.5 attendance value)
- **Check-out**: Before 5:30 PM (0.5 deduction)

### Leave Types
- **Full Day**: 1.0 day deduction
- **Half Day**: 0.5 day deduction
- **Short Leave**: 0.25 day deduction (max 2 per month)
- **Sick/Casual/Earned**: Different leave categories

### Salary Calculation
```
Monthly Salary = (Total Attendance Value / Working Days) × Base Salary
```

### GPS Verification
- Office location configured by admin
- Employees must be within specified radius
- Distance calculated using Haversine formula

## Default Credentials

After running `create-admin-user.js`, use the credentials you set up.

**Example:**
- Email: admin@company.com
- Password: (your chosen password)

## Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution:** Check that all 4 environment variables are set in `.env.local`

### Issue: "Attendance already marked for today"
**Solution:** You can only mark attendance once per day. Use mark-out to record exit time.

### Issue: "You are X km away from office"
**Solution:** 
- Make sure GPS is enabled
- Check that office location is configured correctly in Settings
- Verify you're within the specified radius

### Issue: Selfie upload fails
**Solution:** 
- Check that Supabase Storage bucket `selfies` exists
- Verify storage policies are set up (done by migration script)
- Check browser console for detailed error

### Issue: Login redirect loop on Vercel
**Solution:**
- Verify all environment variables are set in Vercel
- Check that Supabase URL Configuration includes your Vercel domain
- Clear browser cache and try again

## Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Run Production Build
```bash
npm start
```

### Lint Code
```bash
npm run lint
```

## Environment Variables Reference

| Variable | Description | Where to Use |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client & Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Client & Server |
| `SUPABASE_URL` | Supabase project URL | Server only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Server only |

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Security Notes

- Service role key is only used in API routes (server-side)
- All API routes are protected with authentication middleware
- Row Level Security (RLS) policies are enabled on all tables
- Passwords are hashed using Supabase Auth
- GPS and selfie data are stored securely

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js and Supabase**
