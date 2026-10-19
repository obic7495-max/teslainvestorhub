-- TeslaInvestorHub database setup
-- Keep Row Level Security enabled on every table.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Member',
  created_at timestamptz not null default now()
);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Member',
  message text not null check (
    char_length(trim(message)) between 1 and 2000
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_users (
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.community_messages(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (reporter_id, message_id)
);

create table if not exists public.member_workspace (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Enable security on all tables.
alter table public.profiles enable row level security;
alter table public.community_messages enable row level security;
alter table public.blocked_users enable row level security;
alter table public.message_reports enable row level security;
alter table public.member_workspace enable row level security;

-- Profiles: members can read and update only their own profile.
create policy "Members read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Members create own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Members update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Chat: signed-in members can read and send messages.
create policy "Signed-in members read chat"
on public.community_messages for select
to authenticated
using (true);

create policy "Members send own messages"
on public.community_messages for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Members delete own messages"
on public.community_messages for delete
to authenticated
using (auth.uid() = user_id);

-- Block lists: members can manage only their own blocks.
create policy "Members read own blocks"
on public.blocked_users for select
to authenticated
using (auth.uid() = user_id);

create policy "Members add own blocks"
on public.blocked_users for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Members remove own blocks"
on public.blocked_users for delete
to authenticated
using (auth.uid() = user_id);

-- Reports: members can submit and view only their own reports.
create policy "Members submit reports"
on public.message_reports for insert
to authenticated
with check (auth.uid() = reporter_id);

create policy "Members view own reports"
on public.message_reports for select
to authenticated
using (auth.uid() = reporter_id);

-- Workspace: private to each member.
create policy "Members read own workspace"
on public.member_workspace for select
to authenticated
using (auth.uid() = user_id);

create policy "Members create own workspace"
on public.member_workspace for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Members update own workspace"
on public.member_workspace for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Useful chat index.
create index if not exists community_messages_created_at_idx
on public.community_messages (created_at desc);
