/**
 * Supabase Client (Frontend)
 *
 * HOW TO SET UP SUPABASE:
 * 1. Go to https://supabase.com → Create project
 * 2. Settings → API → Copy URL and anon key
 * 3. Add to .env.local:
 *    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
 *
 * This client is used for:
 * - Reading public data (office locations, holidays)
 * - NOT for writing attendance/leaves (done via backend)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
