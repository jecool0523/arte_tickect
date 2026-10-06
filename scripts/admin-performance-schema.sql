-- Applied with Supabase apply_migration; no account identifiers in schema changes.
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists is_presale_user boolean not null default false;
-- Profiles remain SELECT-only for browser roles. Role grants only happen server-side.
create or replace function public.is_current_user_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_admin);
$$;
revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated, service_role;

create table public.performance_settings (
  musical_id text primary key check (musical_id in ('toctoc','rent','dead-poets-society')),
  details jsonb not null check (jsonb_typeof(details) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.performance_settings enable row level security;
revoke all on public.performance_settings from anon, authenticated;
grant select on public.performance_settings to anon, authenticated;
grant insert, update on public.performance_settings to authenticated;
grant all on public.performance_settings to service_role;
create policy "Public performance information" on public.performance_settings for select to anon, authenticated using (true);
create policy "Admin insert performance information" on public.performance_settings for insert to authenticated with check ((select public.is_current_user_admin()));
create policy "Admin update performance information" on public.performance_settings for update to authenticated using ((select public.is_current_user_admin())) with check ((select public.is_current_user_admin()));

create unique index if not exists arte_period_musical_unique on public.arte_musical_application_period (musical_name);
grant select, insert, update on public.arte_musical_application_period to authenticated;
grant usage on sequence public.arte_musical_application_period_id_seq to authenticated;
create policy "Admin insert booking periods" on public.arte_musical_application_period for insert to authenticated with check ((select public.is_current_user_admin()));
create policy "Admin update booking periods" on public.arte_musical_application_period for update to authenticated using ((select public.is_current_user_admin())) with check ((select public.is_current_user_admin()));

create function public.save_admin_performance(p_musical_id text, p_details jsonb, p_start timestamptz, p_end timestamptz) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_current_user_admin() then raise insufficient_privilege; end if;
  if p_musical_id not in ('toctoc','rent','dead-poets-society') or p_start is null or p_end is null or p_start >= p_end then raise exception 'Invalid performance settings'; end if;
  insert into public.performance_settings (musical_id, details) values (p_musical_id, p_details)
    on conflict (musical_id) do update set details = excluded.details, updated_at = now();
  insert into public.arte_musical_application_period (musical_name, start_time, end_time) values (p_musical_id, p_start, p_end)
    on conflict (musical_name) do update set start_time = excluded.start_time, end_time = excluded.end_time;
end;
$$;
revoke all on function public.save_admin_performance(text,jsonb,timestamptz,timestamptz) from public, anon;
grant execute on function public.save_admin_performance(text,jsonb,timestamptz,timestamptz) to authenticated;

create schema if not exists private;
grant usage on schema private to authenticated;
create function private.arte_admin_users(p_limit integer, p_offset integer, p_search text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; total integer;
begin
  if auth.uid() is null or not public.is_current_user_admin() then return jsonb_build_object('success',false,'code','FORBIDDEN'); end if;
  p_limit := greatest(1, least(100, p_limit)); p_offset := greatest(0, p_offset);
  select count(*) into total from public.profiles p join auth.users u on u.id=p.id
  where p_search is null or u.email ilike '%'||p_search||'%' or p.display_name ilike '%'||p_search||'%' or p.student_id ilike '%'||p_search||'%';
  select coalesce(jsonb_agg(x.row), '[]'::jsonb) into result from (
    select jsonb_build_object('id',p.id,'email',u.email,'display_name',p.display_name,'student_id',p.student_id,'avatar_url',p.avatar_url,'is_admin',p.is_admin,'email_confirmed',u.email_confirmed_at is not null,'created_at',p.created_at,'updated_at',p.updated_at,'booking_count',
      (select count(*) from (select user_id from public.toctoc_bookings union all select user_id from public.rent_bookings union all select user_id from public.dead_poets_society_bookings) b where b.user_id=p.id),
      'review_count',(select count(*) from public.reviews r where r.user_id=p.id)) as row
    from public.profiles p join auth.users u on u.id=p.id
    where p_search is null or u.email ilike '%'||p_search||'%' or p.display_name ilike '%'||p_search||'%' or p.student_id ilike '%'||p_search||'%'
    order by p.created_at desc, p.id limit p_limit offset p_offset
  ) x;
  return jsonb_build_object('success',true,'users',result,'total',total,'limit',p_limit,'offset',p_offset);
end; $$;
revoke all on function private.arte_admin_users(integer,integer,text) from public, anon;
grant execute on function private.arte_admin_users(integer,integer,text) to authenticated;
create function public.admin_get_all_users(p_limit integer default 50,p_offset integer default 0,p_search text default null) returns jsonb
language sql security invoker set search_path = '' as $$ select private.arte_admin_users(p_limit,p_offset,p_search); $$;
revoke all on function public.admin_get_all_users(integer,integer,text) from public, anon;
grant execute on function public.admin_get_all_users(integer,integer,text) to authenticated;

create function public.set_user_admin_status(p_target_user_id uuid,p_is_admin boolean,p_by_admin_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id=p_by_admin_id and is_admin) then return jsonb_build_object('success',false,'code','FORBIDDEN'); end if;
  if p_target_user_id=p_by_admin_id and not p_is_admin then return jsonb_build_object('success',false,'code','SELF_DEMOTE_FORBIDDEN'); end if;
  update public.profiles set is_admin=p_is_admin where id=p_target_user_id;
  if not found then return jsonb_build_object('success',false,'code','USER_NOT_FOUND'); end if;
  return jsonb_build_object('success',true,'is_admin',p_is_admin);
end; $$;
revoke all on function public.set_user_admin_status(uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.set_user_admin_status(uuid,boolean,uuid) to service_role;

create function public.set_user_presale_status(p_target_user_id uuid,p_is_presale boolean,p_by_admin_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id=p_by_admin_id and is_admin) then return jsonb_build_object('success',false,'code','FORBIDDEN'); end if;
  update public.profiles set is_presale_user=p_is_presale where id=p_target_user_id;
  if not found then return jsonb_build_object('success',false,'code','USER_NOT_FOUND'); end if;
  return jsonb_build_object('success',true,'is_presale_user',p_is_presale);
end; $$;
revoke all on function public.set_user_presale_status(uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.set_user_presale_status(uuid,boolean,uuid) to service_role;
