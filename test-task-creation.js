/**
 * Test task creation directly in database
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

async function testTaskCreation() {
  console.log('🧪 Testing Task Creation\n')

  // 1. Check if columns are nullable
  console.log('1️⃣ Checking column constraints...')
  const { data: columns, error: colError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'tasks'
        AND column_name IN ('project_id', 'list_id')
      `
    })
    .catch(() => {
      // If RPC doesn't exist, we can't check this way
      return { data: null, error: 'RPC not available' }
    })

  if (colError) {
    console.log('⚠️  Cannot check columns via RPC')
  } else if (columns) {
    console.log('Column info:', columns)
  }

  // 2. Get admin user
  console.log('\n2️⃣ Finding admin user...')
  const { data: admin, error: adminError } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (adminError || !admin) {
    console.log('❌ No admin user found')
    return
  }
  console.log(`✅ Found admin: ${admin.name} (${admin.email})`)

  // 3. Get employee user
  console.log('\n3️⃣ Finding employee user...')
  const { data: employee, error: empError } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('role', 'employee')
    .limit(1)
    .single()

  if (empError || !employee) {
    console.log('❌ No employee user found')
    return
  }
  console.log(`✅ Found employee: ${employee.name} (${employee.email})`)

  // 4. Try to create a task
  console.log('\n4️⃣ Attempting to create task...')
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title: 'Test Task from Script',
      description: 'Testing task creation without project',
      assigned_to: employee.id,
      created_by: admin.id,
      priority: 'medium',
      status: 'todo',
      position: 0,
      project_id: null,
      list_id: null
    })
    .select()
    .single()

  if (taskError) {
    console.log('❌ Failed to create task')
    console.log('Error:', taskError.message)
    console.log('Details:', taskError.details)
    console.log('Hint:', taskError.hint)
    console.log('\n🔧 FIX: Run RUN_THIS_FIRST.sql in Supabase SQL Editor')
    return
  }

  console.log('✅ Task created successfully!')
  console.log('Task ID:', task.id)
  console.log('Title:', task.title)
  console.log('Assigned to:', task.assigned_to)
  console.log('Project ID:', task.project_id)
  console.log('List ID:', task.list_id)

  // 5. Clean up - delete the test task
  console.log('\n5️⃣ Cleaning up...')
  const { error: deleteError } = await supabase
    .from('tasks')
    .delete()
    .eq('id', task.id)

  if (deleteError) {
    console.log('⚠️  Could not delete test task:', deleteError.message)
  } else {
    console.log('✅ Test task deleted')
  }

  console.log('\n✅ All tests passed! Task creation works.')
  console.log('You can now create tasks from the UI.')
}

testTaskCreation().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
