-- Delete all existing labels from all boards (COMPLETE CLEANUP)
-- Run this in Supabase SQL Editor to start fresh with dynamic labels

-- 1. Delete all task-label relationships first (foreign key constraint)
DELETE FROM task_board_labels;

-- 2. Delete all board labels
DELETE FROM board_labels;

-- 3. Verify deletion and show results
SELECT 
  'All labels deleted successfully!' AS status,
  (SELECT COUNT(*) FROM board_labels) AS remaining_board_labels,
  (SELECT COUNT(*) FROM task_board_labels) AS remaining_task_labels;

-- 4. Show any remaining labels (should be empty)
SELECT 
  id, 
  board_id, 
  name, 
  color,
  created_at
FROM board_labels
ORDER BY created_at DESC;
