-- Account fan activity. Execute via a reviewed Supabase migration.
-- Points are derived from existing owned records, never an editable XP balance.
create table private.fan_visits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  visit_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, visit_date)
);
alter table private.fan_visits enable row level security;
revoke all on private.fan_visits from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert on private.fan_visits to service_role;
create index if not exists reviews_fan_user_id_idx on public.reviews(user_id) where user_id is not null;

create function public.get_account_fan_activity(p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_bookings bigint; v_reviews bigint; v_visits bigint; v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = '22023', message = 'Unknown account';
  end if;
  select count(*) into v_bookings from (
    select id from public.dead_poets_society_bookings where user_id = p_user_id and status in ('confirmed','completed')
    union all select id from public.rent_bookings where user_id = p_user_id and status in ('confirmed','completed')
    union all select id from public.toctoc_bookings where user_id = p_user_id and status in ('confirmed','completed')
    union all select id from public.arte_musical_tickets where user_id = p_user_id and status in ('confirmed','completed')
  ) b;
  select count(*) into v_reviews from public.reviews where user_id = p_user_id;
  select count(*) into v_visits from private.fan_visits where user_id = p_user_id;
  return jsonb_build_object('bookingCount',v_bookings,'reviewCount',v_reviews,'visitCount',v_visits,
    'visitedToday',exists(select 1 from private.fan_visits where user_id=p_user_id and visit_date=v_today),'visitDate',v_today);
end; $$;
revoke all on function public.get_account_fan_activity(uuid) from public, anon, authenticated;
grant execute on function public.get_account_fan_activity(uuid) to service_role;

create function public.record_account_fan_visit(p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  -- Only the application server can call this, with a getUser()-verified UID.
  insert into private.fan_visits(user_id,visit_date)
    values(p_user_id,(now() at time zone 'Asia/Seoul')::date)
    on conflict(user_id,visit_date) do nothing;
  return public.get_account_fan_activity(p_user_id);
end; $$;
revoke all on function public.record_account_fan_visit(uuid) from public, anon, authenticated;
grant execute on function public.record_account_fan_visit(uuid) to service_role;

create function public.create_account_review(p_user_id uuid, p_musical_id text, p_user_name text,
  p_deletion_token text, p_content text, p_rating integer, p_image_url text default null)
returns table(id bigint, musical_id text, user_name text, content text, image_url text, rating integer, created_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare v_review record;
begin
  if p_user_id is null or not exists (select 1 from public.profiles where public.profiles.id = p_user_id) then
    raise exception using errcode = '22023', message = 'Unknown account';
  end if;
  -- Preserve token hashing and validation; ownership is bound atomically.
  select * into v_review from public.create_review(p_musical_id,p_user_name,p_deletion_token,p_content,p_rating,p_image_url);
  update public.reviews r set user_id=p_user_id where r.id=v_review.id;
  return query select v_review.id::bigint,v_review.musical_id::text,v_review.user_name::text,
    v_review.content::text,v_review.image_url::text,v_review.rating::integer,v_review.created_at::timestamptz;
end; $$;
revoke all on function public.create_account_review(uuid,text,text,text,text,integer,text) from public, anon, authenticated;
grant execute on function public.create_account_review(uuid,text,text,text,text,integer,text) to service_role;
