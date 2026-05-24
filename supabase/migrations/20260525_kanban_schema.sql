-- ============================================================
-- Kanban Schema Migration
-- Adds boards, columns, labels tables and extends tasks
-- ============================================================

-- New table: boards
CREATE TABLE boards (
  id           TEXT        PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL DEFAULT 'My Board',
  description  TEXT,
  order_index  INTEGER     NOT NULL DEFAULT 1000,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boards_owner" ON boards
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_boards_user_deleted ON boards (user_id, deleted_at);

-- New table: columns
CREATE TABLE columns (
  id           TEXT        PRIMARY KEY,
  board_id     TEXT        NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  color        TEXT,
  order_index  INTEGER     NOT NULL DEFAULT 1000,
  wip_limit    INTEGER,
  is_terminal  BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

ALTER TABLE columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "columns_owner" ON columns
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_columns_board ON columns (board_id, order_index) WHERE deleted_at IS NULL;

-- New table: labels
CREATE TABLE labels (
  id           TEXT        PRIMARY KEY,
  board_id     TEXT        NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  color        TEXT        NOT NULL DEFAULT '#94a3b8',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "labels_owner" ON labels
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_labels_board ON labels (board_id) WHERE deleted_at IS NULL;

-- ============================================================
-- Extend existing tasks table with new V2 fields
-- All new columns are nullable / have defaults so existing rows remain valid
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS board_id     TEXT        REFERENCES boards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS column_id    TEXT        REFERENCES columns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS priority     TEXT        CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS size         TEXT        CHECK (size IN ('xs', 'sm', 'md', 'lg', 'xl')),
  ADD COLUMN IF NOT EXISTS label_ids    TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS due_date     DATE,
  ADD COLUMN IF NOT EXISTS start_date   DATE,
  ADD COLUMN IF NOT EXISTS assignee_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtasks     JSONB       NOT NULL DEFAULT '[]';

-- Migrate note → description non-destructively
UPDATE tasks SET description = note WHERE description IS NULL AND note IS NOT NULL;

-- Indexes for common Kanban query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_board_column
  ON tasks (board_id, column_id, order_index)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON tasks (due_date)
  WHERE deleted_at IS NULL AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_label_ids
  ON tasks USING GIN (label_ids);

-- ============================================================
-- Trigger: keep tasks.completed in sync with column.is_terminal
-- This ensures the denormalized flag stays correct when tasks move columns
-- ============================================================

CREATE OR REPLACE FUNCTION sync_task_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.column_id IS NOT NULL THEN
    NEW.completed := (
      SELECT is_terminal FROM columns WHERE id = NEW.column_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_column_complete_sync ON tasks;

CREATE TRIGGER task_column_complete_sync
  BEFORE INSERT OR UPDATE OF column_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_completed();
