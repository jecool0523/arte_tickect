-- Synthetic fixtures only. This transaction always rolls back.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  suffix text := replace(gen_random_uuid()::text, '-', '');
  n text; s text; u text; t text; result jsonb; owned_id bigint; count_rows integer;
begin
  n := 'onboarding-fixture-' || suffix; s := left(suffix,16); u := left(suffix,30);
  insert into auth.users (id,email,raw_user_meta_data) values
    (a, suffix||'a@test.invalid','{}'), (b,suffix||'b@test.invalid','{}'), (c,suffix||'c@test.invalid','{}');
  result := public.save_profile_and_sync_bookings(b,'B'||left(suffix,29),'other-fixture',s||'b','01012345678');
  assert (result->>'success')::boolean, 'fixture profile';
  foreach t in array array['dead_poets_society_bookings','rent_bookings','toctoc_bookings','arte_musical_tickets'] loop
    execute format('insert into public.%I (name, student_id, seat_grade, selected_seats, status) values ($1,$2,''VIP'',array[''fixture-seat''],''cancelled'')',t) using ' '||n||' ', ' '||s||' ';
  end loop;
  insert into public.rent_bookings (name,student_id,seat_grade,selected_seats,status,user_id)
    values (n,s,'VIP',array['fixture-owned'],'cancelled',b) returning id into owned_id;
  insert into public.rent_bookings (name,student_id,seat_grade,selected_seats,status)
    values (n||'mismatch',s,'VIP',array['fixture-name'],'cancelled'),
           (n,s||'x','VIP',array['fixture-student'],'cancelled');
  result := public.save_profile_and_sync_bookings(a,u,n,s,'010-1234-5678');
  assert (result->>'success')::boolean and (result->>'linked_count')::integer = 4, 'exact pair + four sources';
  assert (select contact_number = '01012345678' from public.profiles where id=a), 'phone normalization';
  assert (select user_id = b from public.rent_bookings where id=owned_id), 'owned booking not reassigned';
  assert (select count(*) = 2 from public.rent_bookings where user_id is null and (name = n||'mismatch' or student_id=s||'x')), 'both fields required';
  result := public.sync_legacy_bookings(a);
  assert (result->>'success')::boolean and (result->>'linked_count')::integer = 0, 'idempotent';
  result := public.save_profile_and_sync_bookings(c,upper(u),'different',s||'c','01012345678');
  assert result->>'code' = 'USERNAME_TAKEN', 'case insensitive username';
  result := public.save_profile_and_sync_bookings(c,'C'||left(suffix,29),n,s,'01012345678');
  assert result->>'code' = 'IDENTITY_TAKEN', 'one account per completed identity';
  result := public.save_profile_and_sync_bookings(a,u,n||'changed',s,'01012345678');
  assert result->>'code' = 'IDENTITY_LOCKED', 'linked identity frozen';
  result := public.save_profile_and_sync_bookings(a,u,n,s,'+821012345678');
  assert (result->>'success')::boolean, 'contact editable';
  result := public.save_profile_and_sync_bookings(c,'bad.id',n,s,null);
  assert result->>'code' = 'INVALID_PROFILE', 'mandatory valid input';
  insert into public.toctoc_bookings (name,student_id,seat_grade,selected_seats,status,user_id)
    values ('existing-account',s||'c','VIP',array['fixture-existing'],'cancelled',c);
  result := public.save_profile_and_sync_bookings(c,'C'||left(suffix,29),'existing-account',s||'c','01012345678');
  assert (result->>'success')::boolean, 'first setup for previously booked account';
  assert not has_function_privilege('anon','public.sync_legacy_bookings(uuid)','EXECUTE'), 'no anonymous linking';
  assert not has_function_privilege('authenticated','public.save_profile_and_sync_bookings(uuid,text,text,text,text)','EXECUTE'), 'no direct browser save';
  perform set_config('request.jwt.claim.sub',a::text,true);
end;
$$;
set local role authenticated;
do $$
begin
  assert (select count(*) = 1 from public.profiles), 'profiles RLS: only self';
  assert (select count(*) = 1 from public.rent_bookings), 'tickets RLS: only self';
  assert (select count(*) = 1 from public.arte_musical_tickets), 'legacy tickets RLS: only self';
end;
$$;
reset role;
do $$
declare a uuid := current_setting('request.jwt.claim.sub')::uuid; result jsonb; t text; remaining boolean;
begin
  result := public.delete_account(a);
  assert (result->>'success')::boolean, 'delete cleanup';
  assert not exists(select 1 from public.profiles where id=a), 'contact and profile removed';
  foreach t in array array['dead_poets_society_bookings','rent_bookings','toctoc_bookings','arte_musical_tickets'] loop
    execute format('select exists(select 1 from public.%I where user_id=$1)',t) into remaining using a;
    assert not remaining, 'owned ticket anonymized';
  end loop;
end;
$$;
rollback;
select 'profile onboarding: exact match, ownership, idempotency, validation, unique ID, identity lock and RLS passed' as result;
