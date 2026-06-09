-- CLEAN ALL LABELS - Remove test/custom labels, keep only priority labels
-- Run this in Supabase SQL Editor

-- Step 1: See what labels currently exist
SELECT 
    bl.id,
    bl.name,
    bl.board_id,
    b.name as board_name,
    COUNT(tbl.task_id) as tasks_using_this_label
FROM board_labels bl
LEFT JOIN boards b ON b.id = bl.board_id
LEFT JOIN task_board_labels tbl ON tbl.board_label_id = bl.id
GROUP BY bl.id, bl.name, bl.board_id, b.name
ORDER BY b.name, bl.name;

-- Step 2: Delete ALL task-label assignments (we'll recreate them from priority field)
DELETE FROM task_board_labels;

-- Step 3: Delete ALL custom labels (we'll keep only priority labels)
DELETE FROM board_labels 
WHERE name NOT IN ('LOW PRIORITY', 'MEDIUM PRIORITY', 'HIGH PRIORITY', 'URGENT PRIORITY');

-- Step 4: For each board, ensure we have exactly 4 priority labels
-- This will create them if they don't exist
DO $$
DECLARE
    board_record RECORD;
    label_low_id UUID;
    label_medium_id UUID;
    label_high_id UUID;
    label_urgent_id UUID;
BEGIN
    -- Loop through all boards
    FOR board_record IN SELECT id FROM boards LOOP
        -- Create LOW PRIORITY if not exists
        INSERT INTO board_labels (board_id, name, color, position)
        VALUES (board_record.id, 'LOW PRIORITY', '#94C748', 65536)
        ON CONFLICT DO NOTHING;
        
        -- Create MEDIUM PRIORITY if not exists
        INSERT INTO board_labels (board_id, name, color, position)
        VALUES (board_record.id, 'MEDIUM PRIORITY', '#E2B203', 131072)
        ON CONFLICT DO NOTHING;
        
        -- Create HIGH PRIORITY if not exists
        INSERT INTO board_labels (board_id, name, color, position)
        VALUES (board_record.id, 'HIGH PRIORITY', '#FEA362', 196608)
        ON CONFLICT DO NOTHING;
        
        -- Create URGENT PRIORITY if not exists
        INSERT INTO board_labels (board_id, name, color, position)
        VALUES (board_record.id, 'URGENT PRIORITY', '#F87168', 262144)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Step 5: Link each task to its priority label
INSERT INTO task_board_labels (task_id, board_label_id)
SELECT 
    t.id as task_id,
    bl.id as board_label_id
FROM tasks t
JOIN board_labels bl ON bl.board_id = t.board_id
WHERE 
    (t.priority = 'low' AND bl.name = 'LOW PRIORITY')
    OR (t.priority = 'medium' AND bl.name = 'MEDIUM PRIORITY')
    OR (t.priority = 'high' AND bl.name = 'HIGH PRIORITY')
    OR (t.priority = 'urgent' AND bl.name = 'URGENT PRIORITY')
ON CONFLICT DO NOTHING;

-- Step 6: Verify - should show only 4 labels per board
SELECT 
    b.name as board_name,
    bl.name as label_name,
    bl.color,
    COUNT(tbl.task_id) as task_count
FROM boards b
LEFT JOIN board_labels bl ON bl.board_id = b.id
LEFT JOIN task_board_labels tbl ON tbl.board_label_id = bl.id
GROUP BY b.id, b.name, bl.name, bl.color, bl.position
ORDER BY b.name, bl.position;

-- Step 7: Verify each task has exactly 1 label
SELECT 
    t.id,
    t.name as task_name,
    t.priority,
    COUNT(tbl.board_label_id) as label_count,
    STRING_AGG(bl.name, ', ') as labels
FROM tasks t
LEFT JOIN task_board_labels tbl ON tbl.task_id = t.id
LEFT JOIN board_labels bl ON bl.id = tbl.board_label_id
GROUP BY t.id, t.name, t.priority
HAVING COUNT(tbl.board_label_id) != 1
ORDER BY t.name;
-- Should return 0 rows (all tasks have exactly 1 label)
