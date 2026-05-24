import type {
  AuthProfile,
  Board,
  Column,
  Label,
  RemoteBootstrapResult,
  SubtaskItem,
  TodoTask,
  UserSettings,
} from "@shared/types";
import { getSupabaseClient } from "@/lib/supabase";

// ============================================================
// Row types (DB schema → TS)
// ============================================================

type TaskRow = {
  id: string;
  user_id: string;
  text: string;
  category: string | null;
  note: string | null;
  description: string | null;
  completed: boolean;
  order_index: number;
  board_id: string | null;
  column_id: string | null;
  priority: string | null;
  size: string | null;
  label_ids: string[];
  due_date: string | null;
  start_date: string | null;
  assignee_id: string | null;
  subtasks: SubtaskItem[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type BoardRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ColumnRow = {
  id: string;
  board_id: string;
  user_id: string;
  name: string;
  color: string | null;
  order_index: number;
  wip_limit: number | null;
  is_terminal: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type LabelRow = {
  id: string;
  board_id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type SettingsRow = {
  theme: UserSettings["theme"];
  completed_section_collapsed: boolean;
  default_mode: UserSettings["defaultMode"];
  accent_theme: UserSettings["accentTheme"];
  show_completed_by_default: boolean;
};

// ============================================================
// Mappers
// ============================================================

function normalizeMetadataString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): AuthProfile {
  const metadata = user.user_metadata ?? {};
  const name = normalizeMetadataString(metadata.full_name) ?? normalizeMetadataString(metadata.name);
  const avatarUrl = normalizeMetadataString(metadata.avatar_url);
  const provider = normalizeMetadataString(metadata.provider);

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    avatarUrl,
    provider,
  };
}

function mapTaskRow(row: TaskRow): TodoTask {
  return {
    id: row.id,
    userId: row.user_id,
    text: row.text,
    category: row.category,
    note: row.note,
    description: row.description,
    completed: row.completed,
    order: row.order_index,
    boardId: row.board_id,
    columnId: row.column_id,
    priority: (row.priority as TodoTask["priority"]) ?? null,
    size: (row.size as TodoTask["size"]) ?? null,
    labelIds: row.label_ids ?? [],
    dueDate: row.due_date,
    startDate: row.start_date,
    assigneeId: row.assignee_id,
    subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: "synced",
  };
}

function mapBoardRow(row: BoardRow): Board {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    order: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: "synced",
  };
}

function mapColumnRow(row: ColumnRow): Column {
  return {
    id: row.id,
    boardId: row.board_id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    order: row.order_index,
    wipLimit: row.wip_limit,
    isTerminal: row.is_terminal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: "synced",
  };
}

function mapLabelRow(row: LabelRow): Label {
  return {
    id: row.id,
    boardId: row.board_id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: "synced",
  };
}

function mapSettingsRow(row: SettingsRow): Partial<UserSettings> {
  return {
    theme: row.theme,
    completedSectionCollapsed: row.completed_section_collapsed,
    defaultMode: row.default_mode,
    accentTheme: row.accent_theme,
    showCompletedByDefault: row.show_completed_by_default,
  };
}

function taskToRow(task: TodoTask) {
  return {
    id: task.id,
    user_id: task.userId,
    text: task.text,
    category: task.category,
    note: task.note,
    description: task.description,
    completed: task.completed,
    order_index: task.order,
    board_id: task.boardId,
    column_id: task.columnId,
    priority: task.priority,
    size: task.size,
    label_ids: task.labelIds ?? [],
    due_date: task.dueDate,
    start_date: task.startDate,
    assignee_id: task.assigneeId,
    subtasks: task.subtasks ?? [],
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    deleted_at: task.deletedAt,
  };
}

function boardToRow(board: Board) {
  return {
    id: board.id,
    user_id: board.userId,
    name: board.name,
    description: board.description,
    order_index: board.order,
    created_at: board.createdAt,
    updated_at: board.updatedAt,
    deleted_at: board.deletedAt,
  };
}

function columnToRow(column: Column) {
  return {
    id: column.id,
    board_id: column.boardId,
    user_id: column.userId,
    name: column.name,
    color: column.color,
    order_index: column.order,
    wip_limit: column.wipLimit,
    is_terminal: column.isTerminal,
    created_at: column.createdAt,
    updated_at: column.updatedAt,
    deleted_at: column.deletedAt,
  };
}

function labelToRow(label: Label) {
  return {
    id: label.id,
    board_id: label.boardId,
    user_id: label.userId,
    name: label.name,
    color: label.color,
    created_at: label.createdAt,
    updated_at: label.updatedAt,
    deleted_at: label.deletedAt,
  };
}

function settingsToRow(settings: UserSettings) {
  return {
    theme: settings.theme,
    completed_section_collapsed: settings.completedSectionCollapsed,
    default_mode: settings.defaultMode,
    accent_theme: settings.accentTheme,
    show_completed_by_default: settings.showCompletedByDefault,
  };
}

// ============================================================
// Auth
// ============================================================

export async function requestMagicCode(email: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw error;
  }
}

export async function verifyMagicCode(email: string, token: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("The code was accepted, but no user profile was returned.");
  }

  return mapProfile(data.user);
}

export async function signOutRemote() {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getRemoteProfile() {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return user ? mapProfile(user) : null;
}

export async function updateRemoteProfileName(name: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const normalizedName = name.trim().slice(0, 60);
  const { data, error } = await client.auth.updateUser({
    data: {
      name: normalizedName || null,
      full_name: normalizedName || null,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("The name was saved, but no user profile was returned.");
  }

  return mapProfile(data.user);
}

// ============================================================
// Bootstrap
// ============================================================

export async function fetchRemoteBootstrap(): Promise<RemoteBootstrapResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { profile: null, tasks: [], boards: [], columns: [], labels: [], settings: null };
  }

  const profile = await getRemoteProfile();
  if (!profile) {
    return { profile: null, tasks: [], boards: [], columns: [], labels: [], settings: null };
  }

  const [
    { data: taskRows, error: taskError },
    { data: boardRows, error: boardError },
    { data: columnRows, error: columnError },
    { data: labelRows, error: labelError },
    { data: settingsRow, error: settingsError },
  ] = await Promise.all([
    client
      .from("tasks")
      .select("*")
      .is("deleted_at", null)
      .order("completed", { ascending: true })
      .order("order_index", { ascending: true }),
    client.from("boards").select("*").is("deleted_at", null).order("order_index", { ascending: true }),
    client.from("columns").select("*").is("deleted_at", null).order("order_index", { ascending: true }),
    client.from("labels").select("*").is("deleted_at", null),
    client.from("user_settings").select("*").maybeSingle(),
  ]);

  if (taskError) throw taskError;
  if (boardError) throw boardError;
  if (columnError) throw columnError;
  if (labelError) throw labelError;
  if (settingsError) throw settingsError;

  return {
    profile,
    tasks: (taskRows as TaskRow[] | null)?.map(mapTaskRow) ?? [],
    boards: (boardRows as BoardRow[] | null)?.map(mapBoardRow) ?? [],
    columns: (columnRows as ColumnRow[] | null)?.map(mapColumnRow) ?? [],
    labels: (labelRows as LabelRow[] | null)?.map(mapLabelRow) ?? [],
    settings: settingsRow ? mapSettingsRow(settingsRow as SettingsRow) : null,
  };
}

// ============================================================
// Tasks
// ============================================================

export async function upsertRemoteTask(task: TodoTask) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const { error } = await client.from("tasks").upsert(taskToRow(task));
  if (error) {
    throw error;
  }
}

export async function upsertRemoteTasks(tasks: TodoTask[]) {
  if (!tasks.length) {
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const { error } = await client.from("tasks").upsert(tasks.map(taskToRow));
  if (error) {
    throw error;
  }
}

export async function softDeleteRemoteTask(taskId: string, deletedAt: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const { error } = await client
    .from("tasks")
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq("id", taskId);

  if (error) {
    throw error;
  }
}

// ============================================================
// Boards
// ============================================================

export async function upsertRemoteBoard(board: Board) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const { error } = await client.from("boards").upsert(boardToRow(board));
  if (error) {
    throw error;
  }
}

export async function softDeleteRemoteBoard(boardId: string, deletedAt: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const { error } = await client
    .from("boards")
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq("id", boardId);

  if (error) {
    throw error;
  }
}

// ============================================================
// Columns
// ============================================================

export async function upsertRemoteColumn(column: Column) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const { error } = await client.from("columns").upsert(columnToRow(column));
  if (error) {
    throw error;
  }
}

export async function softDeleteRemoteColumn(columnId: string, deletedAt: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const { error } = await client
    .from("columns")
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq("id", columnId);

  if (error) {
    throw error;
  }
}

// ============================================================
// Labels
// ============================================================

export async function upsertRemoteLabel(label: Label) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const { error } = await client.from("labels").upsert(labelToRow(label));
  if (error) {
    throw error;
  }
}

export async function softDeleteRemoteLabel(labelId: string, deletedAt: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const { error } = await client
    .from("labels")
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq("id", labelId);

  if (error) {
    throw error;
  }
}

// ============================================================
// Settings
// ============================================================

export async function saveRemoteSettings(settings: UserSettings) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Remote sync is not configured yet.");
  }

  const profile = await getRemoteProfile();
  if (!profile) {
    throw new Error("You need to be signed in before settings can sync.");
  }

  const { error } = await client.from("user_settings").upsert({
    user_id: profile.id,
    ...settingsToRow(settings),
  });

  if (error) {
    throw error;
  }
}
