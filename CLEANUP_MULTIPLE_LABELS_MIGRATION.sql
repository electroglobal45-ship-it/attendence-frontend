-- Migration to clean up multiple labels per task
-- This will keep only ONE label per task (the one with the lowest ID)
-- Run this in Supabase SQL Editor

-- Step 1: Create a temporary table with task_id and the label to keep (first one by created order)
CREATE TEMP TABLE labels_to_keep AS
SELECT DISTINCT ON (task_id) 
    task_id, 
    board_label_id,
    created_at
FROM task_board_labels
ORDER BY task_id, created_at ASC, board_label_id ASC;

-- Step 2: Show what will be deleted (for review)
SELECT 
    tbl.task_id,
    t.name as task_name,
    bl.name as label_name,
    'WILL BE DELETED' as action
FROM task_board_labels tbl
JOIN tasks t ON t.id = tbl.task_id
JOIN board_labels bl ON bl.id = tbl.board_label_id
WHERE NOT EXISTS (
    SELECT 1 FROM labels_to_keep ltk 
    WHERE ltk.task_id = tbl.task_id 
    AND ltk.board_label_id = tbl.board_label_id
);

-- Step 3: Delete all existing task-label assignments EXCEPT the ones we want to keep
DELETE FROM task_board_labels
WHERE NOT EXISTS (
    SELECT 1 FROM labels_to_keep ltk 
    WHERE ltk.task_id = task_board_labels.task_id 
    AND ltk.board_label_id = task_board_labels.board_label_id
);

-- Step 4: Clean up
DROP TABLE labels_to_keep;

-- Step 5: Verification query - run this after migration to verify each task has only 1 label
SELECT 
    task_id,
    COUNT(*) as label_count,
    STRING_AGG(board_labels.name, ', ') as label_names
FROM task_board_labels
JOIN board_labels ON board_labels.id = task_board_labels.board_label_id
GROUP BY task_id 
HAVING COUNT(*) > 1;
-- (Should return 0 rows if successful)

-- Step 6: Show summary of current state
SELECT 
    COUNT(DISTINCT task_id) as tasks_with_labels,
    COUNT(*) as total_label_assignments,
    ROUND(AVG(label_count), 2) as avg_labels_per_task
FROM (
    SELECT task_id, COUNT(*) as label_count
    FROM task_board_labels
    GROUP BY task_id
) subquery;
