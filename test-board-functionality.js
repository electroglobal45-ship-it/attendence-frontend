/**
 * Test board functionality - check projects, lists, and tasks
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

async function testBoardFunctionality() {
  console.log('🔍 Testing Board Functionality\n')

  // 1. Check existing projects
  console.log('1️⃣ Checking existing projects...')
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, public_id, name, description, color, is_active')
    .eq('is_active', true)

  if (projectsError) {
    console.log('❌ Error fetching projects:', projectsError.message)
    return
  }

  console.log(`✅ Found ${projects.length} active projects`)
  projects.forEach(p => {
    console.log(`   - ${p.name} (public_id: ${p.public_id}, id: ${p.id})`)
  })

  if (projects.length === 0) {
    console.log('\n⚠️  No projects found. Creating a test project...')
    
    // Get admin user
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (!adminUser) {
      console.log('❌ No admin user found')
      return
    }

    // Create test project
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        name: 'Test Board',
        description: 'Test board for Trello-like functionality',
        color: '#3B82F6',
        created_by: adminUser.id
      })
      .select('id, public_id, name')
      .single()

    if (createError) {
      console.log('❌ Error creating project:', createError.message)
      return
    }

    console.log(`✅ Created test project: ${newProject.name} (public_id: ${newProject.public_id})`)

    // Add admin as project member
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: newProject.id,
        user_id: adminUser.id,
        role: 'admin',
        status: 'active'
      })

    if (memberError) {
      console.log('❌ Error adding admin as member:', memberError.message)
    } else {
      console.log('✅ Added admin as project member')
    }

    projects.push(newProject)
  }

  // 2. Check lists for first project
  if (projects.length > 0) {
    const testProject = projects[0]
    console.log(`\n2️⃣ Checking lists for project: ${testProject.name}`)

    const { data: lists, error: listsError } = await supabase
      .from('project_lists')
      .select('id, public_id, name, position')
      .eq('project_id', testProject.id)
      .order('position', { ascending: true })

    if (listsError) {
      console.log('❌ Error fetching lists:', listsError.message)
    } else {
      console.log(`✅ Found ${lists.length} lists`)
      lists.forEach(l => {
        console.log(`   - ${l.name} (position: ${l.position})`)
      })

      if (lists.length === 0) {
        console.log('\n⚠️  No lists found. Creating default lists...')
        
        const defaultLists = [
          { name: 'To Do', position: 0 },
          { name: 'In Progress', position: 1 },
          { name: 'Done', position: 2 }
        ]

        for (const list of defaultLists) {
          const { error } = await supabase
            .from('project_lists')
            .insert({
              project_id: testProject.id,
              name: list.name,
              position: list.position,
              color: '#6B7280'
            })

          if (error) {
            console.log(`❌ Error creating list ${list.name}:`, error.message)
          } else {
            console.log(`✅ Created list: ${list.name}`)
          }
        }
      }
    }

    // 3. Check tasks
    console.log(`\n3️⃣ Checking tasks for project: ${testProject.name}`)

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, status, priority, list_id')
      .eq('project_id', testProject.id)

    if (tasksError) {
      console.log('❌ Error fetching tasks:', tasksError.message)
    } else {
      console.log(`✅ Found ${tasks.length} tasks`)
      tasks.forEach(t => {
        console.log(`   - ${t.title} (status: ${t.status}, priority: ${t.priority})`)
      })
    }

    // 4. Test public_id resolution
    console.log(`\n4️⃣ Testing public_id resolution...`)
    console.log(`   Project public_id: ${testProject.public_id}`)
    console.log(`   Project UUID: ${testProject.id}`)

    const { data: resolvedProject, error: resolveError } = await supabase
      .from('projects')
      .select('id, public_id, name')
      .eq('public_id', testProject.public_id)
      .single()

    if (resolveError) {
      console.log('❌ Error resolving public_id:', resolveError.message)
    } else {
      console.log(`✅ Successfully resolved public_id to UUID`)
      console.log(`   Resolved to: ${resolvedProject.id}`)
    }
  }

  console.log('\n✅ Board functionality test complete!')
  console.log('\n📋 Next steps:')
  console.log('   1. Start your dev server: npm run dev')
  console.log('   2. Login as admin')
  console.log('   3. Go to /tasks to see all boards')
  if (projects.length > 0) {
    console.log(`   4. Click on "${projects[0].name}" or go to /board/${projects[0].public_id}`)
  }
}

testBoardFunctionality().catch(console.error)
