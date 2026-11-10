-- Trade Journal — database schema (Supabase / Postgres)
-- Reference copy of what runs in the Supabase project, for reading and for setting up a fresh project.
-- Every table has row-level security (RLS) on: the browser only ever uses the public anon key,
-- so these policies are what keep each user's data private.

-- ---------------------------------------------------------------------------
-- Journal data: one row per document (trade, account, project, review, settings)
-- ---------------------------------------------------------------------------
create table public.docs (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         text not null,
  data       jsonb not null,          -- the document itself; its shape is defined by the app
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.docs enable row level security;
create policy "own rows" on public.docs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Chart screenshots: private bucket, one folder per user (<user id>/<file>)
insert into storage.buckets (id, name, public) values ('shots', 'shots', false);
create policy "own shots read"   on storage.objects for select using (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own shots write"  on storage.objects for insert with check (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own shots delete" on storage.objects for delete using (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Roles and features
-- ---------------------------------------------------------------------------
-- A role is a named set of features, e.g. {"grade": true, "ext": false}.
-- "admin" and "user" always exist; new sign-ups are "user".
create table public.app_roles (
  key        text primary key check (key ~ '^[a-z0-9_-]{1,40}$'),
  name       text not null check (length(name) between 1 and 40),
  features   jsonb not null default '{}'::jsonb,
  sort       int not null default 100,
  created_at timestamptz not null default now()
);
alter table public.app_roles enable row level security;
create policy "Signed-in users read roles" on public.app_roles for select to authenticated using (true);
create policy "Admins add roles"           on public.app_roles for insert to authenticated with check ((select public.is_app_admin()));
create policy "Admins change roles"        on public.app_roles for update to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));
create policy "Admins delete custom roles" on public.app_roles for delete to authenticated using ((select public.is_app_admin()) and key not in ('admin','user'));

-- Which role each user has. Users can read only their own row; admins change it via admin_set_role().
create table public.app_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'user' references public.app_roles(key) on update cascade on delete set default,
  last_seen  timestamptz,               -- legacy, no longer written
  updated_at timestamptz not null default now()
);
alter table public.app_members enable row level security;
create policy "Users read their own membership" on public.app_members for select to authenticated using ((select auth.uid()) = user_id);

-- The first admin is added here by hand; after that admins are managed in the app.
create table public.app_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.app_admins enable row level security;   -- no policies: only reachable through functions

-- Usage: one row per user per day they opened the journal (no times, no activity details).
create table public.app_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  primary key (user_id, day)
);
alter table public.app_activity enable row level security; -- no policies: only reachable through functions

-- ---------------------------------------------------------------------------
-- Functions (security definer: they run with owner rights, so each checks who is calling)
-- ---------------------------------------------------------------------------
create or replace function public.is_app_admin() returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid())
      or exists (select 1 from public.app_members where user_id = auth.uid() and role = 'admin') $$;

-- Called by the app once per day a user opens it.
create or replace function public.touch_seen() returns void language sql security definer set search_path to '' as $$
  insert into public.app_activity(user_id, day) select auth.uid(), (now() at time zone 'Europe/Brussels')::date where auth.uid() is not null
  on conflict do nothing $$;

-- Admin: users with role and usage (trade count only, never trade contents).
create or replace function public.admin_usage() returns table(id uuid, email text, created_at timestamptz, role text, last_day date, days30 int, trades int)
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.is_app_admin() then raise exception 'Not allowed'; end if;
  return query select u.id, u.email::text, u.created_at, coalesce(m.role, 'user'),
    (select max(a.day) from public.app_activity a where a.user_id = u.id),
    (select count(*)::int from public.app_activity a where a.user_id = u.id and a.day > (now() at time zone 'Europe/Brussels')::date - 30),
    (select count(*)::int from public.docs d where d.user_id = u.id and d.data->>'kind' is null and d.data ? 'pair')
  from auth.users u left join public.app_members m on m.user_id = u.id order by u.created_at;
end $$;

-- Admin: give a user a role (you can't remove your own admin role).
create or replace function public.admin_set_role(uid uuid, new_role text) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_app_admin() then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.app_roles where key = new_role) then raise exception 'Unknown role'; end if;
  if uid = auth.uid() and new_role <> 'admin' then raise exception 'You can''t remove your own admin role'; end if;
  insert into public.app_members(user_id, role, updated_at) values (uid, new_role, now())
    on conflict (user_id) do update set role = excluded.role, updated_at = now();
  if new_role = 'admin' then insert into public.app_admins(user_id) select uid where not exists (select 1 from public.app_admins where user_id = uid);
  else delete from public.app_admins where user_id = uid; end if;
end $$;

revoke all on function public.touch_seen(), public.admin_usage(), public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.touch_seen(), public.admin_usage(), public.admin_set_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Legacy, still in the live project but unused by the app since 1.0.0:
-- tables app_flags, app_users; functions admin_users(), admin_set_user(), admin_members().
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Share links (share.html)
-- ---------------------------------------------------------------------------
-- Read-only share links for trades: one link per trade, anyone with the token can view it.
create table if not exists public.shares (
  token      text primary key default replace(gen_random_uuid()::text, '-', ''),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  doc_id     text not null,
  created_at timestamptz not null default now(),
  unique (user_id, doc_id)
);
alter table public.shares enable row level security;
create policy "own shares" on public.shares for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Public: the shared trade, only the fields meant for viewing (no account, project or ids).
create or replace function public.shared_trade(tok text) returns jsonb
language sql stable security definer set search_path to '' as $$
  select (select jsonb_object_agg(e.key, e.value) from jsonb_each(d.data) e
          where e.key = any (array['market','mode','status','pair','dir','date','closeDate','fase','wStruct','wPat','wPatSub',
            'weekly','concept','sub','dMs','dPros','dailyFib','hMs','entry4h','struct','room','ecTf','scaleIn','outcome','r','maxR',
            'exitReason','evaluation','notes','shots','shotLinks']))
         || jsonb_build_object('owner', s.user_id)
  from public.shares s join public.docs d on d.user_id = s.user_id and d.id = s.doc_id
  where s.token = tok $$;
revoke all on function public.shared_trade(text) from public;
grant execute on function public.shared_trade(text) to anon, authenticated;

-- Storage: a screenshot may be read by anyone when it belongs to a shared trade.
create or replace function public.is_shared_shot(obj text) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.shares s join public.docs d on d.user_id = s.user_id and d.id = s.doc_id
    where s.user_id::text = split_part(obj, '/', 1)
      and exists (select 1 from jsonb_each_text(coalesce(d.data->'shots', '{}'::jsonb)) v where v.value = split_part(obj, '/', 2))) $$;
revoke all on function public.is_shared_shot(text) from public;
grant execute on function public.is_shared_shot(text) to anon, authenticated;
create policy "shared shots read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'shots' and public.is_shared_shot(name));
