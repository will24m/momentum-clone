create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0 and char_length(text) <= 4000),
  completed boolean not null default false,
  order_index integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists tasks_user_order_idx
  on public.tasks (user_id, completed, order_index);

create index if not exists tasks_user_updated_idx
  on public.tasks (user_id, updated_at desc);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  completed_section_collapsed boolean not null default true,
  default_mode text not null default 'cloud' check (default_mode in ('local', 'cloud')),
  accent_theme text not null default 'sunrise' check (accent_theme in ('sunrise', 'paper', 'midnight')),
  show_completed_by_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.user_settings enable row level security;

create policy "Users can read their tasks"
on public.tasks
for select
using (auth.uid() = user_id);

create policy "Users can insert their tasks"
on public.tasks
for insert
with check (auth.uid() = user_id);

create policy "Users can update their tasks"
on public.tasks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their tasks"
on public.tasks
for delete
using (auth.uid() = user_id);

create policy "Users can read their settings"
on public.user_settings
for select
using (auth.uid() = user_id);

create policy "Users can insert their settings"
on public.user_settings
for insert
with check (auth.uid() = user_id);

create policy "Users can update their settings"
on public.user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

comment on table public.tasks is
'Todo tasks for the new-tab workspace. Deletions are soft by default via deleted_at.';

comment on table public.user_settings is
'Per-user workspace preferences synced across devices.';
