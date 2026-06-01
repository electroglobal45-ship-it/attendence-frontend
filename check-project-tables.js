/**
 * Check if project management tables and functions exist
 */

const { createClient } = require('@supabase/supabase-js')

// Read .env.local manually
const fs = require('fs')
const path = require('path')

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

async function checkProjectTables() {
  console.log('Checking project management tables...\n')

  const tables = [
    'projects',
    'project_lists',
    'tasks',
    'task_labels',
    'task_label_assignments',
    'task_comments',
    'task_attachments',
    'project_members',
    'task_activities',
    'project_settings'
  ]

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        console.log(`❌ Table '${table}' - ERROR: ${error.message}`)
      } else {
        console.log(`✅ Table '${table}' exists`)
      }
    } catch (err) {
      console.log(`❌ Table '${table}' - ERROR: ${err.message}`)
    }
  }

  console.log('\nChecking database functions...\n')

  // Test create_default_project_lists function
  try {
    const testProjectId = '00000000-0000-0000-0000-000000000000'
    const { data, error } = await supabase
      .rpc('create_default_project_lists', { project_uuid: testProjectId })

    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('❌ Function create_default_project_lists does NOT exist')
    } else if (error && error.message.includes('foreign key')) {
      console.log('✅ Function create_default_project_lists exists (test failed due to FK constraint, which is expected)')
    } else if (error) {
      console.log(`⚠️  Function create_default_project_lists exists but returned error: ${error.message}`)
    } else {
      console.log('✅ Function create_default_project_lists exists and works')
    }
  } catch (err) {
    console.log(`❌ Function create_default_project_lists - ERROR: ${err.message}`)
  }

  // Test create_default_project_labels function
  try {
    const testProjectId = '00000000-0000-0000-0000-000000000000'
    const { data, error } = await supabase
      .rpc('create_default_project_labels', { project_uuid: testProjectId })

    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('❌ Function create_default_project_labels does NOT exist')
    } else if (error && error.message.includes('foreign key')) {
      console.log('✅ Function create_default_project_labels exists (test failed due to FK constraint, which is expected)')
    } else if (error) {
      console.log(`⚠️  Function create_default_project_labels exists but returned error: ${error.message}`)
    } else {
      console.log('✅ Function create_default_project_labels exists and works')
    }
  } catch (err) {
    console.log(`❌ Function create_default_project_labels - ERROR: ${err.message}`)
  }

  console.log('\n✅ Check complete!')
}

checkProjectTables().catch(console.error)
