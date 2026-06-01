/**
 * Check boards (projects) in database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local
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

const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkBoards() {
  console.log('🔍 Checking Boards in Database\n')

  // Check if projects table exists
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .limit(5)

  if (error) {
    console.log('❌ Error:', error.message)
    console.log('\nThe projects table might not exist yet.')
    console.log('Run the migration SQL first!')
    return
  }

  console.log(`Found ${projects.length} boards:\n`)
  
  if (projects.length === 0) {
    console.log('⚠️  No boards found in database!')
    console.log('\nYou need to create a board first.')
    console.log('Go to /tasks page and click "New Board"')
  } else {
    projects.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`)
      console.log(`   ID: ${p.id}`)
      console.log(`   Public ID: ${p.public_id}`)
      console.log(`   Color: ${p.color}`)
      console.log(`   Active: ${p.is_active}`)
      console.log(`   URL: /board/${p.public_id}`)
      console.log('')
    })
  }

  // Check project members
  console.log('\n📋 Checking Board Members...\n')
  const { data: members, error: membersError } = await supabase
    .from('project_members')
    .select('*, projects(name), users(name, email)')
    .limit(10)

  if (membersError) {
    console.log('❌ Error:', membersError.message)
  } else {
    console.log(`Found ${members.length} memberships:\n`)
    members.forEach((m, i) => {
      console.log(`${i + 1}. ${m.users?.name} → ${m.projects?.name}`)
      console.log(`   Role: ${m.role}`)
      console.log(`   Status: ${m.status}`)
      console.log('')
    })
  }

  // Check admin users
  console.log('\n👤 Checking Admin Users...\n')
  const { data: admins, error: adminsError } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('role', 'admin')

  if (adminsError) {
    console.log('❌ Error:', adminsError.message)
  } else {
    console.log(`Found ${admins.length} admin users:\n`)
    admins.forEach((a, i) => {
      console.log(`${i + 1}. ${a.name} (${a.email})`)
      console.log(`   ID: ${a.id}`)
      console.log('')
    })
  }
}

checkBoards().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
