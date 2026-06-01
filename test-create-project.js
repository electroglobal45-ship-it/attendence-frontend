/**
 * Test creating a project with proper authentication
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim()
    env[key] = value
  }
})

async function testCreateProject() {
  console.log('🧪 Testing Project Creation with Supabase Auth\n')

  // Step 1: Login as admin to get access token
  console.log('Step 1: Logging in as admin...')
  const supabaseAuth = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // You need to provide admin credentials here
  const email = 'sharmassaurabh06@gmail.com' // Replace with your admin email
  const password = 'Saurabh@123' // Replace with your admin password

  const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
    email,
    password
  })

  if (authError) {
    console.error('❌ Login failed:', authError.message)
    return
  }

  console.log('✅ Logged in successfully')
  console.log('   User ID:', authData.user.id)
  console.log('   Access Token:', authData.session.access_token.substring(0, 50) + '...')

  // Step 2: Create Supabase client with user's access token
  console.log('\nStep 2: Creating authenticated Supabase client...')
  const supabaseUser = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`
        }
      }
    }
  )

  // Step 3: Try to create a project
  console.log('\nStep 3: Creating test project...')
  const { data: project, error: projectError } = await supabaseUser
    .from('projects')
    .insert({
      name: 'Test Project ' + Date.now(),
      description: 'Testing project creation with RLS',
      color: '#3B82F6',
      workspace_owner_id: authData.user.id,
      created_by: authData.user.id,
      is_active: true,
      is_archived: false
    })
    .select('id, public_id, name, description, color, created_at')
    .single()

  if (projectError) {
    console.error('❌ Project creation failed:', projectError)
    console.error('   Code:', projectError.code)
    console.error('   Message:', projectError.message)
    console.error('   Details:', projectError.details)
    console.error('   Hint:', projectError.hint)
    return
  }

  console.log('✅ Project created successfully!')
  console.log('   Project ID:', project.id)
  console.log('   Public ID:', project.public_id)
  console.log('   Name:', project.name)

  // Step 4: Add creator as project admin
  console.log('\nStep 4: Adding creator as project admin...')
  const { data: member, error: memberError } = await supabaseUser
    .from('project_members')
    .insert({
      project_id: project.id,
      user_id: authData.user.id,
      role: 'admin',
      added_by: authData.user.id,
      status: 'active'
    })
    .select()
    .single()

  if (memberError) {
    console.error('❌ Adding member failed:', memberError)
    console.error('   Code:', memberError.code)
    console.error('   Message:', memberError.message)
    return
  }

  console.log('✅ Member added successfully!')

  // Step 5: Verify we can read the project back
  console.log('\nStep 5: Verifying project can be read...')
  const { data: readProject, error: readError } = await supabaseUser
    .from('projects')
    .select(`
      *,
      project_members!inner(role, status)
    `)
    .eq('id', project.id)
    .eq('project_members.user_id', authData.user.id)
    .eq('project_members.status', 'active')
    .single()

  if (readError) {
    console.error('❌ Reading project failed:', readError)
    return
  }

  console.log('✅ Project read successfully!')
  console.log('   Name:', readProject.name)
  console.log('   Member role:', readProject.project_members[0]?.role)

  console.log('\n✅ All tests passed!')
  console.log('\n📝 Summary:')
  console.log('   - Authentication: ✅')
  console.log('   - Project creation: ✅')
  console.log('   - Member assignment: ✅')
  console.log('   - Project retrieval: ✅')
  console.log('\nThe RLS policies are working correctly!')
}

testCreateProject().catch(console.error)
