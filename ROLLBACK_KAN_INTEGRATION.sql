-- ============================================================================
-- KAN INTEGRATION ROLLBACK SCRIPT
-- ============================================================================
-- This script removes all Kan integration tables and objects
-- Run this in Supabase SQL Editor to completely remove the integration
-- ============================================================================

-- Drop all tables in reverse order (to handle foreign key dependencies)
DROP TABLE IF EXISTS public.card_activities CASCADE;
DROP TABLE IF EXISTS public.card_attachments CASCADE;
DROP TABLE IF EXISTS public.checklist_items CASCADE;
DROP TABLE IF EXISTS public.checklists CASCADE;
DROP TABLE IF EXISTS public.card_comments CASCADE;
DROP TABLE IF EXISTS public.card_labels CASCADE;
DROP TABLE IF EXISTS public.labels CASCADE;
DROP TABLE IF EXISTS public.card_members CASCADE;
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.lists CASCADE;
DROP TABLE IF EXISTS public.board_members CASCADE;
DROP TABLE IF EXISTS public.boards CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;

-- Drop RPC functions
DROP FUNCTION IF EXISTS public.get_user_boards(UUID);
DROP FUNCTION IF EXISTS public.get_user_cards(UUID);
DROP FUNCTION IF EXISTS public.move_card(UUID, UUID, INTEGER, UUID);

-- Note: Storage bucket 'card-attachments' must be deleted manually
-- Go to: Storage → Buckets → Find 'card-attachments' → Delete
-- (Cannot be deleted via SQL for safety reasons)

-- Verification
DO $$
DECLARE
  remaining_tables INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_tables
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'workspaces', 'boards', 'board_members', 'lists', 'cards',
      'card_members', 'labels', 'card_labels', 'card_comments',
      'checklists', 'checklist_items', 'card_attachments', 'card_activities'
    );

  RAISE NOTICE '============================================';
  RAISE NOTICE 'ROLLBACK COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Remaining Kan tables: %', remaining_tables;
  
  IF remaining_tables = 0 THEN
    RAISE NOTICE 'All Kan integration tables removed successfully ✓';
  ELSE
    RAISE WARNING 'Some tables still exist! Count: %', remaining_tables;
  END IF;
  
  RAISE NOTICE '============================================';
END $$;

-- Final message
SELECT 
  '✓ Rollback completed! All Kan integration tables removed.' AS status,
  NOW() AS completed_at;
