# CRM Attendance System - Serverless Edition

A fully serverless attendance management system built with Next.js and Supabase.

## 🏗️ Architecture

**Frontend**: Next.js 14 (React + TypeScript)  
**Database**: Supabase (PostgreSQL)  
**Authentication**: Supabase Auth  
**Storage**: Supabase Storage  
**Business Logic**: PostgreSQL Functions

### No Backend Server Required! 🎉

All business logic runs as PostgreSQL functions directly in the database. This eliminates the need for a separate backend server, reducing complexity and costs.

```
┌─────────────────┐
│  Next.js App    │
│   (Frontend)    │
└────────┬────────┘
         │
         │ Direct Connection
         │
┌────────▼────────┐
│    Supabase     │
│  - Database     │
│  - Auth         │
│  - Storage      │
│  - Functions    │
└─────────────────┘
```

## ✨ Features

### For Employees
- ✅ Check-in/Check-out with GPS validation
- 📸 Selfie capture for attendance
- 📅 Apply for leaves (full day, half day, short leave)
- 📊 View attendance history and statistics
- 💰 View salary slips
- 🏖️ Track leave balance

### For Admins
- 👥 Manage employees
- ✅ Approve/reject leave requests
- 📈 View attendance reports
- 💵 Calculate and manage salaries
- 📊 Export data (CSV/Excel)
- 🎯 Dashboard with analytics
- 🏢 Manage office locations and holidays

### Business Rules
- **Timing**: 9:00-9:05 AM (Present), 9:05-9:30 AM (Late, 4/month), >9:30 AM (Half Day)
- **Leave Credit**: 1.5 days/month (regular), 1 day/month (intern/probation)
- **Short Leave**: Max 2 hours, 2 per month
- **Sandwich Leave**: Auto-detected holidays between leave days
- **No-Leave Bonus**: 2 days salary for months with zero leaves
- **Salary**: (Monthly Salary / Working Days) × Attendance Value

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account ([supabase.com](https://supabase.com))

### 1. Clone and Install

```bash
cd Attendence
npm install
```

### 2. Setup Supabase

1. Create a new project on [Supabase](https://supabase.com)
2. Go to SQL Editor and run:
   - `DATABASE_SETUP.sql` (creates tables)
   - `supabase/migrations/001_database_functions.sql` (creates functions)

### 3. Configure Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from: Supabase Dashboard → Settings → API

### 4. Create Storage Bucket

In Supabase Dashboard:
1. Go to Storage
2. Create a new bucket named `selfies`
3. Set it to **Public**

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Create Admin User

Run this SQL in Supabase SQL Editor:

```sql
-- Create admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@company.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Create admin profile
INSERT INTO users (
  id,
  email,
  name,
  role,
  is_active
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@company.com'),
  'admin@company.com',
  'Admin User',
  'admin',
  true
);
```

Login with:
- Email: `admin@company.com`
- Password: `admin123`

## 📁 Project Structure

```
Attendence/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── (admin)/           # Admin pages
│   │   ├── (employee)/        # Employee pages
│   │   └── (auth)/            # Auth pages
│   ├── components/            # React components
│   │   ├── ui/               # UI primitives
│   │   └── shared/           # Shared components
│   ├── lib/
│   │   └── supabase/         # Supabase services
│   │       ├── client.ts     # Supabase client
│   │       ├── auth.ts       # Authentication
│   │       ├── attendance.ts # Attendance operations
│   │       ├── leaves.ts     # Leave operations
│   │       ├── salary.ts     # Salary operations
│   │       └── export.ts     # Export operations
│   └── hooks/                # Custom React hooks
├── supabase/
│   └── migrations/           # Database migrations
├── public/                   # Static files
├── .env.local               # Environment variables
└── package.json             # Dependencies
```

## 🔧 Database Functions

All business logic is implemented as PostgreSQL functions:

### Attendance
- `mark_attendance()` - Check-in with validation
- `mark_checkout()` - Check-out with time validation
- `get_today_attendance()` - Get current day attendance
- `evaluate_check_in()` - Apply timing rules

### Leaves
- `apply_leave()` - Submit leave request
- `approve_leave()` - Approve/reject leave
- `apply_short_leave()` - Apply for short leave
- `calculate_leave_balance()` - Get leave balance
- `detect_sandwich_leave()` - Auto-detect sandwich leaves

### Salary
- `calculate_salary()` - Calculate monthly salary
- `calculate_diwali_bonus()` - Calculate Diwali bonus
- `calculate_internship_bonus()` - Calculate internship bonus

### Export
- `get_attendance_report()` - Export attendance data
- `get_salary_report()` - Export salary data
- `get_leaves_report()` - Export leave data

## 🔐 Security

### Row Level Security (RLS)

All tables have RLS policies:
- Employees can only access their own data
- Admins can access all data
- Policies enforced at database level

### Authentication

- JWT-based authentication via Supabase Auth
- Secure password hashing (bcrypt)
- Session management with automatic refresh

## 📊 Usage Examples

### Mark Attendance

```typescript
import { markAttendance } from '@/lib/supabase'

const result = await markAttendance({
  employee_id: userId,
  check_in_time: new Date().toISOString(),
  selfie_url: selfieUrl,
  gps_data: {
    latitude: 28.6139,
    longitude: 77.2090,
    accuracy: 10,
    captured_at: new Date().toISOString()
  }
})
```

### Apply Leave

```typescript
import { applyLeave } from '@/lib/supabase'

const result = await applyLeave({
  employee_id: userId,
  leave_type: 'full_day',
  start_date: '2026-05-20',
  end_date: '2026-05-22',
  reason: 'Personal work'
})
```

### Calculate Salary

```typescript
import { calculateSalary } from '@/lib/supabase'

const result = await calculateSalary(userId, 2026, 5)
```

## 🚢 Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Database (Supabase)

Already hosted! Just run the migration scripts.

## 📈 Performance

- **Direct Database Connection**: No middleware overhead
- **Connection Pooling**: Handled by Supabase
- **Indexes**: All frequently queried columns indexed
- **Caching**: Use React Query or SWR for client-side caching

## 🔄 Migration from Backend

This project was migrated from a backend-based architecture to serverless:

**Before**: Frontend → Next.js API → Express Backend → Supabase  
**After**: Frontend → Supabase (PostgreSQL Functions)

**Benefits**:
- ✅ No server management
- ✅ Lower costs
- ✅ Better performance
- ✅ Automatic scaling
- ✅ Simpler deployment

## 📝 Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📚 Documentation

- [Architecture](./ARCHITECTURE.md) - Detailed architecture documentation
- [Database Setup](./DATABASE_SETUP.sql) - Database schema
- [Functions](./supabase/migrations/001_database_functions.sql) - All database functions
- [Quick Start](./QUICK_START.md) - Quick start guide
- [Setup Guide](./SETUP_GUIDE.md) - Detailed setup instructions

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env.local` exists with correct values
- Restart dev server after adding env variables

### "RLS policy violation"
- Check if user is authenticated
- Verify RLS policies in Supabase Dashboard

### "Function not found"
- Ensure `001_database_functions.sql` was run
- Check Supabase Dashboard → Database → Functions

### GPS validation failing
- Ensure office location is configured in `office_locations` table
- Check GPS permissions in browser

## 🤝 Support

For issues or questions:
1. Check [Supabase Documentation](https://supabase.com/docs)
2. Check [Next.js Documentation](https://nextjs.org/docs)
3. Review `ARCHITECTURE.md` for system design

## 📄 License

Private - Internal Use Only

## 🎯 Roadmap

- [ ] Real-time notifications
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Biometric authentication
- [ ] Multi-office support
- [ ] Automated reports via email

---

**Built with ❤️ using Next.js and Supabase**
