#!/usr/bin/env node

/**
 * Project Management Setup Script
 * 
 * This script helps set up initial data for the project management system
 * Run after applying the KAN_PROJECT_MANAGEMENT_MIGRATION.sql
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupProjectManagement() {
  console.log('🚀 Setting up Project Management System...\n');

  try {
    // 1. Verify tables exist
    console.log('1. Verifying database tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (tablesError) {
      console.error('❌ Project management tables not found!');
      console.error('Please run the KAN_PROJECT_MANAGEMENT_MIGRATION.sql script first.');
      console.error('Error:', tablesError.message);
      return;
    }
    console.log('✅ Database tables verified');

    // 2. Check if admin user exists
    console.log('\n2. Checking for admin users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return;
    }

    if (users.users.length === 0) {
      console.log('⚠️  No users found. Please create an admin user first using create-admin-user.js');
      return;
    }

    const adminUser = users.users.find(user => 
      user.user_metadata?.role === 'admin' || 
      user.email?.includes('admin')
    ) || users.users[0];

    console.log(`✅ Found admin user: ${adminUser.email}`);

    // 3. Create a sample project
    console.log('\n3. Creating sample project...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: 'Sample Project',
        description: 'This is a sample project to demonstrate the project management system',
        workspace_owner_id: adminUser.id,
        created_by: adminUser.id,
        color: '#3B82F6'
      })
      .select()
      .single();

    if (projectError) {
      console.error('❌ Error creating sample project:', projectError.message);
      return;
    }
    console.log(`✅ Sample project created: ${project.name} (ID: ${project.public_id})`);

    // 4. Add admin as project member
    console.log('\n4. Adding admin as project member...');
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: adminUser.id,
        role: 'admin',
        added_by: adminUser.id,
        status: 'active'
      });

    if (memberError) {
      console.error('❌ Error adding project member:', memberError.message);
      return;
    }
    console.log('✅ Admin added as project member');

    // 5. Create default lists using the function
    console.log('\n5. Creating default project lists...');
    const { error: listsError } = await supabase.rpc('create_default_project_lists', {
      project_uuid: project.id
    });

    if (listsError) {
      console.error('❌ Error creating default lists:', listsError.message);
      return;
    }
    console.log('✅ Default lists created (To Do, In Progress, Review, Done)');

    // 6. Create default labels using the function
    console.log('\n6. Creating default project labels...');
    const { error: labelsError } = await supabase.rpc('create_default_project_labels', {
      project_uuid: project.id
    });

    if (labelsError) {
      console.error('❌ Error creating default labels:', labelsError.message);
      return;
    }
    console.log('✅ Default labels created (Bug, Feature, Enhancement, Documentation, Urgent)');

    // 7. Create project settings
    console.log('\n7. Creating project settings...');
    const { data: lists } = await supabase
      .from('project_lists')
      .select('id')
      .eq('project_id', project.id)
      .eq('name', 'To Do')
      .single();

    const { error: settingsError } = await supabase
      .from('project_settings')
      .insert({
        project_id: project.id,
        default_list_id: lists?.id,
        auto_assign_creator: true,
        notify_on_task_creation: true,
        notify_on_task_assignment: true,
        notify_on_due_date: true,
        integrate_with_attendance: false
      });

    if (settingsError) {
      console.error('❌ Error creating project settings:', settingsError.message);
      return;
    }
    console.log('✅ Project settings configured');

    // 8. Create a sample task
    console.log('\n8. Creating sample task...');
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: 'Welcome to Project Management',
        description: 'This is your first task! You can edit, move, and manage tasks using the Kanban board.',
        list_id: lists.id,
        project_id: project.id,
        created_by: adminUser.id,
        assigned_to: adminUser.id,
        priority: 'medium',
        status: 'todo',
        position: 0
      })
      .select()
      .single();

    if (taskError) {
      console.error('❌ Error creating sample task:', taskError.message);
      return;
    }
    console.log(`✅ Sample task created: ${task.title}`);

    // 9. Verify storage bucket
    console.log('\n9. Verifying storage bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error checking storage buckets:', bucketsError.message);
      return;
    }

    const taskAttachmentsBucket = buckets.find(bucket => bucket.name === 'task-attachments');
    if (taskAttachmentsBucket) {
      console.log('✅ Task attachments storage bucket verified');
    } else {
      console.log('⚠️  Task attachments bucket not found - it will be created automatically when needed');
    }

    // 10. Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 PROJECT MANAGEMENT SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Sample Project: ${project.name}`);
    console.log(`🔑 Project ID: ${project.public_id}`);
    console.log(`👤 Admin User: ${adminUser.email}`);
    console.log(`📝 Sample Task: ${task.title}`);
    console.log('='.repeat(60));
    console.log('\nNext Steps:');
    console.log('1. Start your development server: npm run dev');
    console.log('2. Navigate to /projects to see your project management dashboard');
    console.log('3. Create API routes for project management');
    console.log('4. Build the frontend components');
    console.log('\n✨ Happy coding!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the setup
setupProjectManagement().catch(console.error);