-- =============================================================================
-- Flowboard — full database schema
--
-- Run this whole file once in the Supabase dashboard:
--   SQL Editor → New query → paste → Run.
--
-- It is written to be re-runnable: every object is dropped first if it exists.
-- WARNING: re-running it deletes all existing data in these tables.
--
-- Security model: every row stores the id of the (anonymous) user who owns it,
-- and Row Level Security (RLS) policies only let a user touch their own rows.
-- =============================================================================

-- Start from a clean slate (children before parents because of foreign keys).
drop table if exists public.activity       cascade;
drop table if exists public.comments       cascade;
drop table if exists public.task_labels    cascade;
drop table if exists public.task_assignees cascade;
drop table if exists public.labels         cascade;
drop table if exists public.members        cascade;
drop table if exists public.tasks          cascade;
drop function if exists public.log_task_changes()     cascade;
drop function if exists public.log_assignee_changes() cascade;
drop function if exists public.log_label_changes()    cascade;
drop function if exists public.touch_updated_at()     cascade;


-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- The tasks shown on the board.
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  -- default auth.uid() fills in the logged-in user automatically on insert.
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 1 and 200),
  description text check (char_length(description) <= 5000),
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority    text not null default 'normal'
              check (priority in ('low', 'normal', 'high')),
  due_date    date,
  -- Sort order inside a column. Fractional so a card can be dropped between
  -- two others without renumbering the whole column.
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index tasks_user_status_position_idx on public.tasks (user_id, status, position);

-- Team members that tasks can be assigned to (not real login accounts).
create table public.members (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 60),
  color      text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);
create index members_user_idx on public.members (user_id);

-- Custom labels such as "Bug" or "Feature".
create table public.labels (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 40),
  color      text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index labels_user_idx on public.labels (user_id);

-- Many-to-many: a task can have several assignees, a member several tasks.
create table public.task_assignees (
  task_id    uuid not null references public.tasks (id)   on delete cascade,
  member_id  uuid not null references public.members (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, member_id)
);
create index task_assignees_member_idx on public.task_assignees (member_id);

-- Many-to-many: a task can have several labels.
create table public.task_labels (
  task_id    uuid not null references public.tasks (id)  on delete cascade,
  label_id   uuid not null references public.labels (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id)
);
create index task_labels_label_idx on public.task_labels (label_id);

-- Comments written in the task detail panel.
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_task_idx on public.comments (task_id, created_at);

-- History of changes to a task. Rows are written by the triggers below,
-- so the log is complete even if a change does not come from this app.
create table public.activity (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- e.g. 'created', 'status', 'priority', 'assignee_added' …
  kind       text not null,
  -- Details such as {"from": "todo", "to": "done"}.
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_task_idx on public.activity (task_id, created_at);


-- -----------------------------------------------------------------------------
-- Table privileges
--
-- Anonymous guests signed in through Supabase Auth use the "authenticated"
-- database role. Grant it table access explicitly (RLS below still limits
-- which rows it can see). The "anon" role (no session at all) gets nothing.
-- -----------------------------------------------------------------------------

revoke all on public.tasks, public.members, public.labels, public.task_assignees,
              public.task_labels, public.comments, public.activity from anon;
grant select, insert, update, delete
  on public.tasks, public.members, public.labels, public.task_assignees,
     public.task_labels, public.comments
  to authenticated;
grant select, insert on public.activity to authenticated;


-- -----------------------------------------------------------------------------
-- Row Level Security
--
-- With RLS enabled, Postgres denies every row by default. Each policy below
-- re-allows only rows whose user_id equals the id in the caller's login token.
-- `(select auth.uid())` is wrapped in a select so Postgres evaluates it once
-- per query instead of once per row.
-- -----------------------------------------------------------------------------

alter table public.tasks          enable row level security;
alter table public.members        enable row level security;
alter table public.labels         enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_labels    enable row level security;
alter table public.comments       enable row level security;
alter table public.activity       enable row level security;

-- Simple ownership policies.
create policy "own tasks"   on public.tasks   for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own members" on public.members for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own labels"  on public.labels  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Link tables, comments and activity also check that the task (and member /
-- label) being linked belongs to the same user, so nobody can attach rows to
-- someone else's task even if they guessed its id.
create policy "own task_assignees" on public.task_assignees for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks   t where t.id = task_id   and t.user_id = (select auth.uid()))
    and exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid()))
  );

create policy "own task_labels" on public.task_labels for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks  t where t.id = task_id  and t.user_id = (select auth.uid()))
    and exists (select 1 from public.labels l where l.id = label_id and l.user_id = (select auth.uid()))
  );

create policy "own comments" on public.comments for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
  );

-- Activity is read-only from the app: no update or delete policy exists, so
-- history cannot be rewritten. Inserts happen through the triggers.
create policy "read own activity" on public.activity for select to authenticated
  using (user_id = (select auth.uid()));
create policy "insert own activity" on public.activity for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
  );


-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- Keep tasks.updated_at current on every update.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- Write activity rows when a task is created or its fields change.
create function public.log_task_changes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'created', jsonb_build_object('status', new.status));
    return new;
  end if;

  -- "is distinct from" treats NULL correctly, unlike "<>".
  if new.status is distinct from old.status then
    insert into public.activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'status', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.title is distinct from old.title then
    insert into public.activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'title', jsonb_build_object('from', old.title, 'to', new.title));
  end if;
  if new.priority is distinct from old.priority then
    insert into public.activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'priority', jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'due_date', jsonb_build_object('from', old.due_date, 'to', new.due_date));
  end if;
  if new.description is distinct from old.description then
    insert into public.activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'description', '{}'::jsonb);
  end if;
  return new;
end;
$$;

create trigger tasks_log_insert
  after insert on public.tasks
  for each row execute function public.log_task_changes();
create trigger tasks_log_update
  after update on public.tasks
  for each row execute function public.log_task_changes();

-- Log assignee changes. The member's name is copied into the log so the
-- history still reads correctly if that member is later deleted.
create function public.log_assignee_changes() returns trigger
language plpgsql set search_path = '' as $$
declare
  member_name text;
begin
  if tg_op = 'INSERT' then
    select name into member_name from public.members where id = new.member_id;
    insert into public.activity (task_id, user_id, kind, meta)
    values (new.task_id, new.user_id, 'assignee_added', jsonb_build_object('name', member_name));
    return new;
  end if;

  -- When a whole task is deleted its links are deleted too; skip logging then,
  -- because the task (and its activity) is already gone.
  if exists (select 1 from public.tasks where id = old.task_id) then
    select name into member_name from public.members where id = old.member_id;
    insert into public.activity (task_id, user_id, kind, meta)
    values (old.task_id, old.user_id, 'assignee_removed', jsonb_build_object('name', member_name));
  end if;
  return old;
end;
$$;

create trigger task_assignees_log
  after insert or delete on public.task_assignees
  for each row execute function public.log_assignee_changes();

-- Same idea for labels.
create function public.log_label_changes() returns trigger
language plpgsql set search_path = '' as $$
declare
  label_name text;
begin
  if tg_op = 'INSERT' then
    select name into label_name from public.labels where id = new.label_id;
    insert into public.activity (task_id, user_id, kind, meta)
    values (new.task_id, new.user_id, 'label_added', jsonb_build_object('name', label_name));
    return new;
  end if;

  if exists (select 1 from public.tasks where id = old.task_id) then
    select name into label_name from public.labels where id = old.label_id;
    insert into public.activity (task_id, user_id, kind, meta)
    values (old.task_id, old.user_id, 'label_removed', jsonb_build_object('name', label_name));
  end if;
  return old;
end;
$$;

create trigger task_labels_log
  after insert or delete on public.task_labels
  for each row execute function public.log_label_changes();
