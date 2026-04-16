import type { AuthProfile, RemoteBootstrapResult, TodoTask, UserSettings } from "@shared/types";
import { getSupabaseClient } from "@/lib/supabase";

type TaskRow = {
  id: string;
  user_id: string;
  text: string;
  category: string | null;
  note: string | null;
  completed: boolean;
  order_index: number;
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

function mapProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): AuthProfile {
  const metadata = user.user_metadata ?? {};
  const name =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;
  const avatarUrl = typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;
  const provider = typeof metadata.provider === "string" ? metadata.provider : null;

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
    completed: row.completed,
    order: row.order_index,
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
    completed: task.completed,
    order_index: task.order,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    deleted_at: task.deletedAt,
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

export async function fetchRemoteBootstrap(): Promise<RemoteBootstrapResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      profile: null,
      tasks: [],
      settings: null,
    };
  }

  const profile = await getRemoteProfile();
  if (!profile) {
    return {
      profile: null,
      tasks: [],
      settings: null,
    };
  }

  const [{ data: taskRows, error: taskError }, { data: settingsRow, error: settingsError }] =
    await Promise.all([
      client
        .from("tasks")
        .select("*")
        .is("deleted_at", null)
        .order("completed", { ascending: true })
        .order("order_index", { ascending: true }),
      client.from("user_settings").select("*").maybeSingle(),
    ]);

  if (taskError) {
    throw taskError;
  }

  if (settingsError) {
    throw settingsError;
  }

  return {
    profile,
    tasks: (taskRows as TaskRow[] | null)?.map(mapTaskRow) ?? [],
    settings: settingsRow ? mapSettingsRow(settingsRow as SettingsRow) : null,
  };
}

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
