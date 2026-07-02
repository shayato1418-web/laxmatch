alter table public.profiles
  add column if not exists is_suspended boolean default false;

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy if not exists "users_read_own_notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

create policy if not exists "users_update_own_notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id);

create policy if not exists "admins_manage_notifications"
  on public.notifications
  for insert
  with check (true);
