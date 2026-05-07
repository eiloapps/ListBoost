create extension if not exists pgcrypto;

create table if not exists public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  plan text not null default 'free' check (plan in ('free', 'pro', 'unlimited')),
  credits_remaining integer,
  free_credits_remaining integer not null default 3 check (free_credits_remaining >= 0 and free_credits_remaining <= 3),
  lemonsqueezy_customer_id text,
  lemonsqueezy_subscription_id text,
  lemonsqueezy_variant_id text,
  subscription_status text,
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_credits
  add column if not exists email text not null default '',
  add column if not exists plan text not null default 'free',
  add column if not exists credits_remaining integer,
  add column if not exists free_credits_remaining integer not null default 3,
  add column if not exists lemonsqueezy_customer_id text,
  add column if not exists lemonsqueezy_subscription_id text,
  add column if not exists lemonsqueezy_variant_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.user_credits
set free_credits_remaining = coalesce(free_credits_remaining, greatest(least(coalesce(credits_remaining, 3), 3), 0));

update public.user_credits
set credits_remaining = case
  when plan = 'unlimited' then null
  when plan = 'free' then coalesce(free_credits_remaining, 3)
  when plan = 'pro' and credits_remaining is null then 50
  else credits_remaining
end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_credits_plan_check'
  ) then
    alter table public.user_credits
      add constraint user_credits_plan_check
      check (plan in ('free', 'pro', 'unlimited'));
  end if;
end $$;

create index if not exists user_credits_email_idx on public.user_credits (lower(email));
create unique index if not exists user_credits_lemonsqueezy_subscription_id_idx
  on public.user_credits (lemonsqueezy_subscription_id)
  where lemonsqueezy_subscription_id is not null;
create index if not exists user_credits_lemonsqueezy_customer_id_idx
  on public.user_credits (lemonsqueezy_customer_id)
  where lemonsqueezy_customer_id is not null;

create table if not exists public.webhook_events (
  event_id text primary key,
  event_name text not null,
  payload jsonb,
  status text not null default 'processed' check (status in ('processing', 'processed', 'failed')),
  error_message text,
  processed_at timestamptz not null default timezone('utc', now())
);

alter table public.webhook_events
  add column if not exists status text not null default 'processed',
  add column if not exists error_message text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'webhook_events_status_check'
  ) then
    alter table public.webhook_events
      add constraint webhook_events_status_check
      check (status in ('processing', 'processed', 'failed'));
  end if;
end $$;

alter table public.user_credits enable row level security;
alter table public.webhook_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_credits'
      and policyname = 'users can view own credits row'
  ) then
    create policy "users can view own credits row"
    on public.user_credits
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;

  drop policy if exists "users can insert own credits row" on public.user_credits;
  drop policy if exists "users can update own credits row" on public.user_credits;
end $$;

create or replace function public.consume_generation_credit(p_user_id uuid)
returns public.user_credits
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.user_credits;
begin
  update public.user_credits
  set
    credits_remaining = case
      when plan = 'unlimited' then credits_remaining
      else greatest(coalesce(credits_remaining, 0) - 1, 0)
    end,
    free_credits_remaining = case
      when plan = 'free' then greatest(free_credits_remaining - 1, 0)
      else free_credits_remaining
    end
  where user_id = p_user_id
    and (plan = 'unlimited' or coalesce(credits_remaining, 0) > 0)
  returning * into updated_row;

  return updated_row;
end;
$$;

revoke all on function public.consume_generation_credit(uuid) from public, anon, authenticated;
grant execute on function public.consume_generation_credit(uuid) to service_role;

create or replace function public.refund_generation_credit(p_user_id uuid, p_plan text)
returns public.user_credits
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.user_credits;
begin
  if p_plan = 'unlimited' then
    select * into updated_row
    from public.user_credits
    where user_id = p_user_id;

    return updated_row;
  end if;

  update public.user_credits
  set
    credits_remaining = case
      when p_plan = 'pro' then least(coalesce(credits_remaining, 0) + 1, 50)
      else coalesce(credits_remaining, 0) + 1
    end,
    free_credits_remaining = case
      when p_plan = 'free' then least(free_credits_remaining + 1, 3)
      else free_credits_remaining
    end
  where user_id = p_user_id
  returning * into updated_row;

  return updated_row;
end;
$$;

revoke all on function public.refund_generation_credit(uuid, text) from public, anon, authenticated;
grant execute on function public.refund_generation_credit(uuid, text) to service_role;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_user_credits_updated_at on public.user_credits;
create trigger set_user_credits_updated_at
before update on public.user_credits
for each row
execute function public.handle_updated_at();

create or replace function public.handle_new_auth_user_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_credits (
    user_id,
    email,
    plan,
    credits_remaining,
    free_credits_remaining
  )
  values (
    new.id,
    coalesce(new.email, ''),
    'free',
    3,
    3
  )
  on conflict (user_id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_user_credits on auth.users;
create trigger on_auth_user_created_user_credits
after insert on auth.users
for each row
execute function public.handle_new_auth_user_credits();
