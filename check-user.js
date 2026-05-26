/**
 * Check User Status in Database
 * Run: node check-user.js
 */

const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read .env.local file
const envFile = fs.readFileSync('.env.local', 'utf8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkUser(email) {
  console.log('\n🔍 Checking user:', email)
  console.log('─'.repeat(60))

  try {
    // 1. Check in auth.users
    console.log('\n1️⃣ Checking Supabase Auth...')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Auth error:', authError.message)
      return
    }

    const authUser = authUsers.users.find(u => u.email === email)
    
    if (!authUser) {
      console.log('❌ User NOT found in auth.users')
      console.log('   → User needs to be created first')
      return
    }

    console.log('✅ User found in auth.users')
    console.log('   ID:', authUser.id)
    console.log('   Email:', authUser.email)
    console.log('   Email Confirmed:', authUser.email_confirmed_at ? '✅ Yes' : '❌ No')
    console.log('   Created:', authUser.created_at)
    console.log('   Last Sign In:', authUser.last_sign_in_at || 'Never')

    // 2. Check in public.users table
    console.log('\n2️⃣ Checking public.users table...')
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profileError) {
      console.error('❌ Profile error:', profileError.message)
      console.log('   → User profile might be missing in public.users table')
      
      // Try to create profile
      console.log('\n🔧 Attempting to create user profile...')
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email,
          name: authUser.email.split('@')[0],
          role: 'employee',
          is_active: true,
          employee_type: 'regular'
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Failed to create profile:', createError.message)
      } else {
        console.log('✅ Profile created successfully!')
        console.log('   ID:', newProfile.id)
        console.log('   Email:', newProfile.email)
        console.log('   Name:', newProfile.name)
        console.log('   Role:', newProfile.role)
        console.log('   Active:', newProfile.is_active)
      }
      return
    }

    console.log('✅ User profile found')
    console.log('   ID:', profile.id)
    console.log('   Email:', profile.email)
    console.log('   Name:', profile.name)
    console.log('   Role:', profile.role)
    console.log('   Active:', profile.is_active ? '✅ Yes' : '❌ No')
    console.log('   Employee Type:', profile.employee_type)
    console.log('   Created:', profile.created_at)

    if (!profile.is_active) {
      console.log('\n⚠️  User is INACTIVE - Activating...')
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', profile.id)

      if (updateError) {
        console.error('❌ Failed to activate:', updateError.message)
      } else {
        console.log('✅ User activated successfully!')
      }
    }

    // 3. Check attendance records
    console.log('\n3️⃣ Checking attendance records...')
    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .order('date', { ascending: false })
      .limit(5)

    if (attError) {
      console.error('❌ Attendance error:', attError.message)
    } else {
      console.log(`   Found ${attendance?.length || 0} attendance records`)
      if (attendance && attendance.length > 0) {
        attendance.forEach(att => {
          console.log(`   - ${att.date}: ${att.status} (value: ${att.attendance_value})`)
        })
      }
    }

    console.log('\n' + '─'.repeat(60))
    console.log('✅ User check complete!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'malhotratanmay06@gmail.com'
checkUser(email).then(() => process.exit(0))
