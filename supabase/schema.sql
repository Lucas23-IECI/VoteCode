create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.votes (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  game_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id),
  constraint votes_game_id_check check (
    game_id in (
      'rv-there-yet',
      'sons-of-the-forest',
      'risk-of-rain-2',
      'plague-inc',
      'super-battle-golf',
      'gamble-with-your-friends',
      'golf-with-your-friends',
      'escape-the-backrooms',
      'gang-beasts',
      'deathsprint-66'
    )
  )
);

create index if not exists votes_game_id_idx on public.votes(game_id);
create index if not exists votes_created_at_idx on public.votes(created_at desc);

alter table public.profiles enable row level security;
alter table public.votes enable row level security;

drop policy if exists "profiles are visible to everyone" on public.profiles;
drop policy if exists "users can insert own profile" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "votes are visible to everyone" on public.votes;
drop policy if exists "users can insert own votes" on public.votes;
drop policy if exists "users can delete own votes" on public.votes;

create policy "profiles are visible to everyone"
on public.profiles for select
using (true);

create policy "users can insert own profile"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "users can update own profile"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "votes are visible to everyone"
on public.votes for select
using (true);

create policy "users can insert own votes"
on public.votes for insert
with check (auth.uid() = user_id);

create policy "users can delete own votes"
on public.votes for delete
using (auth.uid() = user_id);
