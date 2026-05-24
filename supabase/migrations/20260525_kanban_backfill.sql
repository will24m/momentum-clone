-- ============================================================
-- Kanban Data Backfill
-- Run once after 20260525_kanban_schema.sql to migrate existing users
-- Safe to run multiple times (ON CONFLICT DO NOTHING)
-- ============================================================

-- Step 1: Create a default board per user (for users who have tasks but no board yet)
INSERT INTO boards (id, user_id, name, order_index, created_at, updated_at)
SELECT
  'board_default_' || id::text,
  id,
  'My Board',
  1000,
  now(),
  now()
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM boards WHERE user_id = auth.users.id AND deleted_at IS NULL
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create default columns for each board that has none
INSERT INTO columns (id, board_id, user_id, name, color, order_index, is_terminal, created_at, updated_at)
SELECT
  'col_todo_' || b.user_id::text,
  b.id,
  b.user_id,
  'To Do',
  '#94a3b8',
  1000,
  false,
  now(),
  now()
FROM boards b
WHERE b.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM columns WHERE board_id = b.id AND deleted_at IS NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO columns (id, board_id, user_id, name, color, order_index, is_terminal, created_at, updated_at)
SELECT
  'col_inprogress_' || b.user_id::text,
  b.id,
  b.user_id,
  'In Progress',
  '#818cf8',
  2000,
  false,
  now(),
  now()
FROM boards b
WHERE b.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM columns
    WHERE board_id = b.id AND name = 'In Progress' AND deleted_at IS NULL
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO columns (id, board_id, user_id, name, color, order_index, is_terminal, created_at, updated_at)
SELECT
  'col_done_' || b.user_id::text,
  b.id,
  b.user_id,
  'Done',
  '#4ade80',
  3000,
  true,
  now(),
  now()
FROM boards b
WHERE b.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM columns
    WHERE board_id = b.id AND name = 'Done' AND deleted_at IS NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Step 3: Assign tasks to columns based on completed flag
UPDATE tasks t
SET
  board_id  = 'board_default_' || t.user_id::text,
  column_id = CASE
    WHEN t.completed = true
    THEN 'col_done_' || t.user_id::text
    ELSE 'col_todo_' || t.user_id::text
  END,
  updated_at = now()
WHERE t.board_id IS NULL
  AND t.user_id IS NOT NULL
  AND t.deleted_at IS NULL;

-- Step 4: Create one label per unique category string per user
INSERT INTO labels (id, board_id, user_id, name, color, created_at, updated_at)
SELECT DISTINCT
  'label_' || md5(t.user_id::text || lower(trim(t.category))),
  'board_default_' || t.user_id::text,
  t.user_id,
  trim(t.category),
  '#94a3b8',
  now(),
  now()
FROM tasks t
WHERE t.category IS NOT NULL
  AND trim(t.category) != ''
  AND t.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM boards WHERE id = 'board_default_' || t.user_id::text)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Assign label_ids on tasks from their category
UPDATE tasks t
SET
  label_ids  = ARRAY['label_' || md5(t.user_id::text || lower(trim(t.category)))],
  updated_at = now()
WHERE t.category IS NOT NULL
  AND trim(t.category) != ''
  AND t.user_id IS NOT NULL
  AND t.label_ids = '{}'::text[];
