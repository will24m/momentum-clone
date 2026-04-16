alter table public.tasks
  add column if not exists category text
  check (
    category is null
    or (char_length(trim(category)) > 0 and char_length(category) <= 48)
  );

alter table public.tasks
  add column if not exists note text
  check (
    note is null
    or char_length(note) <= 4000
  );

comment on column public.tasks.category is
'Optional task category label used to visually group work.';

comment on column public.tasks.note is
'Optional subnote or context shown underneath the task text.';
