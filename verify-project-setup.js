#!/usr/bin/env node

/**
 * Project Management Verification Script
 * 
 * This script verifies that the project management system is set up correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifySetup() {
  console.log('🔍 Verifying Project Management Setup...\n');

  const checks = [
    {
      name: 'Projects table',
      check: async () => {
        const { data, error } = await supabase.from('projects').select('count').single();
        return { success: !error, data: data?.count || 0 };
      }
    },
    {
      name: 'Project Lists table',
      check: async () => {
        const { data, error } = await supabase.from('project_lists').select('count').single();
        return { success: !error, data: data?.count || 0 };
      }
    },
    {
      name: 'Tasks table',
      check: async () => {
        const { data, error } = await supabase.from('tasks').select('count').single();
        return { success: !error, data: data?.count || 0 };
      }
    },
    {
      name: 'Task Labels table',
      check: async () => {
        const { data, error } = await supabase.from('task_labels').select('count').single();
        return { success: !error, data: data?.count || 0 };
      }
    },
    {
      name: 'Project Members table',
      check: async () => {
        const { data, error } = await supabase.from('project_members').select('count').single();
        return { success: !error, data: data?.count || 0 };
      }
    },
    {
      name: 'Task Comments table',
      check: async () => {
        const { data, error } = await supabase.from('task_comments').select('count').single();
        return { success: !error, data: data?.count || 0 };
      }
    },
    {
      name: 'Task Attachments table',
      check: async () => {
        const { data, error } = await supabase.from('task_attachments').select('count').single();
        return { success: !error, data: data?.count || 0 };
      }
    },
    {
      name: 'Task Activities table',
      check: async () => {
        const { data, error } = await supabase.from('task_activities').select('count').single();
        return { success: !error, data: data?.count || 0 };
      }
    },
    {
      name: 'Project Settings table',
      check: async () => {
        const { data, error } = await supabase.from('project_settings').select('count').single();
        return { success: !error, data: data?.count || 0 };
      }
    },
    {
      name: 'Storage bucket (task-attachments)',
      check: async () => {
        const { data, error } = await supabase.storage.listBuckets();
        const bucket = data?.find(b => b.name === 'task-attachments');
        return { success: !error && !!bucket, data: bucket ? 'exists' : 'missing' };
      }
    }
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      const result = await check.check();
      if (result.success) {
        console.log(`✅ ${check.name}: ${result.data}`);
      } else {
        console.log(`❌ ${check.name}: Failed`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${check.name}: Error - ${error.message}`);
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 All checks passed! Project management system is ready.');
  } else {
    console.log('⚠️  Some checks failed. Please review the migration script.');
  }
  console.log('='.repeat(50));

  // Show sample data if available
  try {
    const { data: projects } = await supabase
      .from('projects')
      .select(`
        name,
        public_id,
        project_lists(name, position),
        tasks(title, status),
        task_labels(name, color)
      `)
      .limit(1);

    if (projects && projects.length > 0) {
      const project = projects[0];
      console.log('\n📊 Sample Project Data:');
      console.log(`Project: ${project.name} (${project.public_id})`);
      console.log(`Lists: ${project.project_lists?.length || 0}`);
      console.log(`Tasks: ${project.tasks?.length || 0}`);
      console.log(`Labels: ${project.task_labels?.length || 0}`);
    }
  } catch (error) {
    console.log('\n⚠️  Could not fetch sample data');
  }
}

verifySetup().catch(console.error);