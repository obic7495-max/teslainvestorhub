-- TeslaInvestorHub Community App setup
-- Run once in Supabase Dashboard -> SQL Editor -> New query.
-- This file adds social tables and Row Level Security. Do NOT add a service-role key to the website.

begin;

-- Public profile fields only. Email addresses remain in Supabase Auth and are not stored here.
alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
create unique index if not exists profiles_handle_unique_idx
  on public.profiles (lower(handle)) where handle is not null and length(trim(handle)) > 0;

-- Community posts and post interactions.
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 3000),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(body)) > 0 or image_url is not null)
);

create table if not exists public.social_post_likes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.social_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.social_post_saves (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.social_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

-- 24-hour stories. Old stories stay in the database briefly but are not shown after expiry.
create table if not exists public.social_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text not null default '' check (char_length(caption) <= 240),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- Private messages. The policies below limit each message to its two participants.
create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create table if not exists public.social_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('like','comment','follow')),
  post_id uuid references public.social_posts(id) on delete cascade,
  detail text check (detail is null or char_length(detail) <= 240),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.social_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.social_posts(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (reporter_id, post_id)
);

-- Useful indexes for feeds, comments, notifications and private conversations.
create index if not exists social_posts_created_at_idx on public.social_posts(created_at desc);
create index if not exists social_posts_user_created_idx on public.social_posts(user_id, created_at desc);
create index if not exists social_comments_post_created_idx on public.social_post_comments(post_id, created_at asc);
create index if not exists social_likes_post_idx on public.social_post_likes(post_id);
create index if not exists social_follows_follower_idx on public.social_follows(follower_id);
create index if not exists social_stories_expiry_idx on public.social_stories(expires_at desc);
create index if not exists social_messages_conversation_idx on public.social_messages(sender_id, recipient_id, created_at desc);
create index if not exists social_notifications_recipient_idx on public.social_notifications(recipient_id, created_at desc);

-- Enable RLS for every new table.
alter table public.profiles enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_post_likes enable row level security;
alter table public.social_post_comments enable row level security;
alter table public.social_post_saves enable row level security;
alter table public.social_follows enable row level security;
alter table public.social_stories enable row level security;
alter table public.social_messages enable row level security;
alter table public.social_notifications enable row level security;
alter table public.social_reports enable row level security;

-- Profiles contain only public display data. Existing policies for own profile remain safe;
-- this extra policy allows anonymous visitors to view public profiles and public posts.
drop policy if exists "Public may view community profiles" on public.profiles;
create policy "Public may view community profiles" on public.profiles
  for select to anon, authenticated using (true);

-- Posts can be read without an account; writing and editing always requires authentication.
drop policy if exists "Public read community posts" on public.social_posts;
create policy "Public read community posts" on public.social_posts
  for select to anon, authenticated using (true);
drop policy if exists "Members create own posts" on public.social_posts;
create policy "Members create own posts" on public.social_posts
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Members update own posts" on public.social_posts;
create policy "Members update own posts" on public.social_posts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Members delete own posts" on public.social_posts;
create policy "Members delete own posts" on public.social_posts
  for delete to authenticated using (auth.uid() = user_id);

-- Likes are public so like totals can be displayed, but each member controls only their own like.
drop policy if exists "Public read post likes" on public.social_post_likes;
create policy "Public read post likes" on public.social_post_likes
  for select to anon, authenticated using (true);
drop policy if exists "Members like posts as themselves" on public.social_post_likes;
create policy "Members like posts as themselves" on public.social_post_likes
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Members remove own likes" on public.social_post_likes;
create policy "Members remove own likes" on public.social_post_likes
  for delete to authenticated using (auth.uid() = user_id);

-- Comments are public to read; only the signed-in author may add/remove their comment.
drop policy if exists "Public read post comments" on public.social_post_comments;
create policy "Public read post comments" on public.social_post_comments
  for select to anon, authenticated using (true);
drop policy if exists "Members create own comments" on public.social_post_comments;
create policy "Members create own comments" on public.social_post_comments
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Members delete own comments" on public.social_post_comments;
create policy "Members delete own comments" on public.social_post_comments
  for delete to authenticated using (auth.uid() = user_id);

-- Saved items are private to their owner.
drop policy if exists "Members read own saves" on public.social_post_saves;
create policy "Members read own saves" on public.social_post_saves
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Members save posts as themselves" on public.social_post_saves;
create policy "Members save posts as themselves" on public.social_post_saves
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Members remove own saves" on public.social_post_saves;
create policy "Members remove own saves" on public.social_post_saves
  for delete to authenticated using (auth.uid() = user_id);

-- Follow graph is public; only the follower controls their own edge.
drop policy if exists "Public read follows" on public.social_follows;
create policy "Public read follows" on public.social_follows
  for select to anon, authenticated using (true);
drop policy if exists "Members follow as themselves" on public.social_follows;
create policy "Members follow as themselves" on public.social_follows
  for insert to authenticated with check (auth.uid() = follower_id and follower_id <> followed_id);
drop policy if exists "Members unfollow as themselves" on public.social_follows;
create policy "Members unfollow as themselves" on public.social_follows
  for delete to authenticated using (auth.uid() = follower_id);

-- Stories are public only while active; each member can manage only their own.
drop policy if exists "Public read active stories" on public.social_stories;
create policy "Public read active stories" on public.social_stories
  for select to anon, authenticated using (expires_at > now());
drop policy if exists "Members create own stories" on public.social_stories;
create policy "Members create own stories" on public.social_stories
  for insert to authenticated with check (auth.uid() = user_id and expires_at <= now() + interval '25 hours' and expires_at > now());
drop policy if exists "Members delete own stories" on public.social_stories;
create policy "Members delete own stories" on public.social_stories
  for delete to authenticated using (auth.uid() = user_id);

-- Private messages: participants can read; senders can create messages; recipients can update read_at only.
drop policy if exists "Participants read private messages" on public.social_messages;
create policy "Participants read private messages" on public.social_messages
  for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Members send messages as themselves" on public.social_messages;
create policy "Members send messages as themselves" on public.social_messages
  for insert to authenticated with check (auth.uid() = sender_id and sender_id <> recipient_id);
drop policy if exists "Recipients mark messages read" on public.social_messages;
create policy "Recipients mark messages read" on public.social_messages
  for update to authenticated using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
-- Column-level grants prevent recipients from changing message bodies when recording read receipts.
revoke update on public.social_messages from authenticated;
grant update (read_at) on public.social_messages to authenticated;

-- Notifications can only be read or marked as read by the recipient. Trigger functions add notifications.
drop policy if exists "Members read own notifications" on public.social_notifications;
create policy "Members read own notifications" on public.social_notifications
  for select to authenticated using (auth.uid() = recipient_id);
drop policy if exists "Members mark own notifications read" on public.social_notifications;
create policy "Members mark own notifications read" on public.social_notifications
  for update to authenticated using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
revoke update on public.social_notifications from authenticated;
grant update (read_at) on public.social_notifications to authenticated;

-- A member can report a post once; reports are private to their reporter.
drop policy if exists "Members report posts" on public.social_reports;
create policy "Members report posts" on public.social_reports
  for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists "Members view own reports" on public.social_reports;
create policy "Members view own reports" on public.social_reports
  for select to authenticated using (auth.uid() = reporter_id);

-- Automatic in-app activity notifications.
create or replace function public.social_notify_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.social_posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.social_notifications(recipient_id, actor_id, kind, post_id)
    values (owner_id, new.user_id, 'like', new.post_id);
  end if;
  return new;
end; $$;

drop trigger if exists social_like_notification on public.social_post_likes;
create trigger social_like_notification after insert on public.social_post_likes
  for each row execute function public.social_notify_like();

create or replace function public.social_notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.social_posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.social_notifications(recipient_id, actor_id, kind, post_id, detail)
    values (owner_id, new.user_id, 'comment', new.post_id, left(new.body, 200));
  end if;
  return new;
end; $$;

drop trigger if exists social_comment_notification on public.social_post_comments;
create trigger social_comment_notification after insert on public.social_post_comments
  for each row execute function public.social_notify_comment();

create or replace function public.social_notify_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.social_notifications(recipient_id, actor_id, kind)
  values (new.followed_id, new.follower_id, 'follow');
  return new;
end; $$;

drop trigger if exists social_follow_notification on public.social_follows;
create trigger social_follow_notification after insert on public.social_follows
  for each row execute function public.social_notify_follow();

-- Public bucket for media intentionally attached to public posts and public stories.
-- Upload paths start with the uploader's auth user id; storage policies restrict changes to that folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-media', 'social-media', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Public read social media" on storage.objects;
create policy "Public read social media" on storage.objects
  for select to anon, authenticated using (bucket_id = 'social-media');
drop policy if exists "Members upload social media to own folder" on storage.objects;
create policy "Members upload social media to own folder" on storage.objects
  for insert to authenticated with check (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Members delete own social media" on storage.objects;
create policy "Members delete own social media" on storage.objects
  for delete to authenticated using (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);

commit;

-- Notes:
-- 1) Keep the existing profiles and community_messages tables; this script extends them.
-- 2) Never expose a Supabase service_role key in any public file.
-- 3) Configure Auth -> URL Configuration in Supabase for the deployed GitHub Pages URL.
-- 4) Consider moderation and backups before opening a public community to a large audience.
