begin;
do $test$
declare v_admin uuid; v_user uuid; v_profile public.profiles%rowtype; v_result jsonb; v_seat text; v_grade text; v_id bigint;
begin
  select id into v_admin from public.profiles where is_admin order by id limit 1;
  select * into v_profile from public.profiles where profile_completed_at is not null and username is not null and contact_number is not null order by id limit 1;
  v_user := v_profile.id;
  if v_admin is null or v_user is null then raise exception 'Missing verified test fixtures'; end if;
  if has_function_privilege('authenticated','public.book_musical_seats(text,text,text,text,text[],text,uuid)','EXECUTE')
    or has_function_privilege('anon','public.book_musical_seats(text,text,text,text,text[],text,uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.set_user_presale_status(uuid,boolean,uuid)','EXECUTE')
    or has_column_privilege('authenticated','public.profiles','is_presale_user','UPDATE') then raise exception 'Unauthorized direct access'; end if;
  v_result := public.set_user_presale_status(v_user,true,gen_random_uuid());
  if v_result->>'code' <> 'FORBIDDEN' then raise exception 'Non-admin grant allowed'; end if;
  v_result := public.set_user_presale_status(v_user,true,v_admin);
  if v_result->>'success' <> 'true' then raise exception 'Admin grant failed'; end if;
  select seat, grade into v_seat, v_grade from (
    select 'F1-VIP-R'||lpad(r::text,2,'0')||'-C'||lpad(c::text,2,'0') seat, 'VIP' grade from generate_series(1,9) r cross join generate_series(1,12) c
    union all select 'F1-R-R'||lpad(r::text,2,'0')||'-C'||lpad(c::text,2,'0'), 'R' from generate_series(1,8) r cross join generate_series(1,12) c
    union all select 'F2-S-R'||lpad(r::text,2,'0')||'-C'||lpad(c::text,2,'0'), 'S' from generate_series(1,8) r cross join generate_series(1,12) c
  ) seats where not exists(select 1 from public.toctoc_bookings b where b.status='confirmed' and seats.seat=any(b.selected_seats)) limit 1;
  if v_seat is null then raise exception 'No free test seat'; end if;
  update public.arte_musical_application_period set start_time=clock_timestamp()+interval '1 day',end_time=clock_timestamp()+interval '2 days' where musical_name='toctoc';
  perform set_config('request.jwt.claim.sub',v_admin::text,true);
  v_result := public.admin_get_all_users(100,0,null);
  if not exists(select 1 from jsonb_array_elements(v_result->'users') u where u->>'id'=v_user::text and u->>'is_presale_user'='true') then raise exception 'Admin list permission missing'; end if;
  v_result := public.book_musical_seats('toctoc',v_profile.display_name,v_profile.student_id,v_grade,array[v_seat],null,v_user);
  if v_result->>'success' <> 'true' or v_result->>'presale' <> 'true' then raise exception 'Authorized presale failed: %',v_result->>'code'; end if;
  v_id := (v_result->>'bookingId')::bigint;
  -- Reuse a free seat in this rollback-only transaction.
  update public.toctoc_bookings set status='cancelled' where id=v_id;
  v_result := public.set_user_presale_status(v_user,false,v_admin);
  if v_result->>'success' <> 'true' then raise exception 'Revoke failed'; end if;
  v_result := public.book_musical_seats('toctoc',v_profile.display_name,v_profile.student_id,v_grade,array[v_seat],null,v_user);
  if v_result->>'code' <> 'PRESALE_PERMISSION_REQUIRED' then raise exception 'Revoked user booked'; end if;
  update public.arte_musical_application_period set start_time=clock_timestamp()-interval '1 day',end_time=clock_timestamp()+interval '1 day' where musical_name='toctoc';
  v_result := public.book_musical_seats('toctoc',v_profile.display_name,v_profile.student_id,v_grade,array[v_seat],null,v_user);
  if v_result->>'success' <> 'true' or v_result->>'presale' <> 'false' then raise exception 'Ordinary public booking failed'; end if;
  v_id := (v_result->>'bookingId')::bigint;
  update public.toctoc_bookings set status='cancelled' where id=v_id;
  perform public.set_user_presale_status(v_user,true,v_admin);
  update public.arte_musical_application_period set start_time=clock_timestamp()-interval '2 days',end_time=clock_timestamp()-interval '1 day' where musical_name='toctoc';
  v_result := public.book_musical_seats('toctoc',v_profile.display_name,v_profile.student_id,v_grade,array[v_seat],null,v_user);
  if v_result->>'code' <> 'BOOKING_CLOSED' then raise exception 'Presale user booked after close'; end if;
end;
$test$;
rollback;
select 'grant/revoke, ordinary-user denial, admin list, pre-opening booking, public booking, post-close denial, direct RPC and profile-edit denial passed; all data rolled back' as result;
