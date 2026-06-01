/**
 * Test script to verify Trello database enhancements
 * Run this after executing TRELLO_DATABASE_ENHANCEMENTS.sql
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseEnhancements() {
  console.log('🔍 Testing Trello Database Enhancements...\n')

  let allTestsPassed = true

  // Test 1: Check if task_checklists table exists
  console.log('Test 1: Checking task_checklists table...')
  const { data: checklistsTable, error: checklistsError } = await supabase
    .from('task_checklists')
    .select('*')
    .limit(1)
  
  if (checklistsError && !checklistsError.message.includes('0 rows')) {
    console.log('❌ task_checklists table not found')
    console.log('   Error:', checklistsError.message)
    allTestsPassed = false
  } else {
    console.log('✅ task_checklists table exists\n')
  }

  // Test 2: Check if checklist_items table exists
  console.log('Test 2: Checking checklist_items table...')
  const { data: itemsTable, error: itemsError } = await supabase
    .from('checklist_items')
    .select('*')
    .limit(1)
  
  if (itemsError && !itemsError.message.includes('0 rows')) {
    console.log('❌ checklist_items table not found')
    console.log('   Error:', itemsError.message)
    allTestsPassed = false
  } else {
    console.log('✅ checklist_items table exists\n')
  }

  // Test 3: Check if tasks table has new columns
  console.log('Test 3: Checking tasks table new columns...')
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, cover_type, cover_value, cover_size, start_date, is_completed')
    .limit(1)
  
  if (tasksError) {
    console.log('❌ New columns not found in tasks table')
    console.log('   Error:', tasksError.message)
    allTestsPassed = false
  } else {
    console.log('✅ tasks table has new columns (cover_type, cover_value, cover_size, start_date, is_completed)\n')
  }

  // Test 4: Check if projects table has new columns
  console.log('Test 4: Checking projects table new columns...')
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, background_type, background_value, is_starred')
    .limit(1)
  
  if (projectsError) {
    console.log('❌ New columns not found in projects table')
    console.log('   Error:', projectsError.message)
    allTestsPassed = false
  } else {
    console.log('✅ projects table has new columns (background_type, background_value, is_starred)\n')
  }

  // Test 5: Check if helper functions exist
  console.log('Test 5: Checking helper functions...')
  const { data: progressData, error: progressError } = await supabase
    .rpc('get_checklist_progress', { checklist_uuid: '00000000-0000-0000-0000-000000000000' })
  
  if (progressError && !progressError.message.includes('0 rows')) {
    console.log('⚠️  get_checklist_progress function may not exist')
    console.log('   Error:', progressError.message)
  } else {
    console.log('✅ Helper functions exist\n')
  }

  // Test 6: Try to create a test checklist (if we have a task)
  console.log('Test 6: Testing checklist creation...')
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('id')
    .limit(1)
  
  if (existingTasks && existingTasks.length > 0) {
    const testTaskId = existingTasks[0].id
    
    // Try to create a test checklist
    const { data: testChecklist, error: createError } = await supabase
      .from('task_checklists')
      .insert({
        task_id: testTaskId,
        title: 'Test Checklist',
        position: 0
      })
      .select()
      .single()
    
    if (createError) {
      console.log('❌ Failed to create test checklist')
      console.log('   Error:', createError.message)
      allTestsPassed = false
    } else {
      console.log('✅ Successfully created test checklist')
      
      // Try to create a test checklist item
      const { data: testItem, error: itemCreateError } = await supabase
        .from('checklist_items')
        .insert({
          checklist_id: testChecklist.id,
          content: 'Test item',
          position: 0,
          is_completed: false
        })
        .select()
        .single()
      
      if (itemCreateError) {
        console.log('❌ Failed to create test checklist item')
        console.log('   Error:', itemCreateError.message)
        allTestsPassed = false
      } else {
        console.log('✅ Successfully created test checklist item')
        
        // Clean up test data
        await supabase.from('checklist_items').delete().eq('id', testItem.id)
        await supabase.from('task_checklists').delete().eq('id', testChecklist.id)
        console.log('✅ Test data cleaned up\n')
      }
    }
  } else {
    console.log('⚠️  No tasks found to test checklist creation')
    console.log('   Create a project and task first, then run this test again\n')
  }

  // Summary
  console.log('═══════════════════════════════════════════')
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED!')
    console.log('   Database enhancements are working correctly.')
    console.log('   You can now proceed to build the frontend.')
  } else {
    console.log('❌ SOME TESTS FAILED')
    console.log('   Please check the errors above.')
    console.log('   Make sure you ran TRELLO_DATABASE_ENHANCEMENTS.sql')
  }
  console.log('═══════════════════════════════════════════\n')
}

// Run tests
testDatabaseEnhancements()
  .then(() => {
    console.log('✓ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
