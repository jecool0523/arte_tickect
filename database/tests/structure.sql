-- Rollback-only structural checks. No persisted fixtures; sequence gaps are harmless.
begin;
do $$
declare t text; v_count integer;
begin
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity) then
    raise exception 'Application table without RLS';
  end if;
  foreach t in array array['arte_musical_tickets','dead_poets_society_bookings','rent_bookings','toctoc_bookings'] loop
    select count(*) into v_count from information_schema.columns where table_schema='public' and table_name=t and column_name in ('status','booking_date') and is_nullable='NO';
    if v_count <> 2 then raise exception 'Required booking fields not enforced: %',t; end if;
    if not exists(select 1 from pg_indexes where schemaname='public' and tablename=t and indexname='idx_'||t||'_owner_date' and indexdef like '%(user_id, booking_date DESC)%') then
      raise exception 'Owner/date index missing: %',t;
    end if;
    begin
      execute format('insert into public.%I (name,student_id,seat_grade,selected_seats,status) values (''structure-test'',''DBTEST'',''VIP'',array[''test-seat''],''bogus'')',t);
      raise exception 'Invalid status accepted: %',t;
    exception when check_violation then null; end;
    begin
      execute format('insert into public.%I (name,student_id,seat_grade,selected_seats,status) values (''structure-test'',''DBTEST'',''VIP'',array[]::text[],''cancelled'')',t);
      raise exception 'Empty seats accepted: %',t;
    exception when check_violation then null; end;
    begin
      execute format('insert into public.%I (name,student_id,seat_grade,selected_seats,status) values (''structure-test'',''DBTEST'',''VIP'',array[null]::text[],''cancelled'')',t);
      raise exception 'Null seat accepted: %',t;
    exception when check_violation then null; end;
    begin
      execute format('insert into public.%I (name,student_id,seat_grade,selected_seats,status) values (''structure-test'',''DBTEST'',''VIP'',array[''test-seat''],null)',t);
      raise exception 'Null status accepted: %',t;
    exception when not_null_violation then null; end;
  end loop;
  if to_regclass('public.arte_period_musical_unique') is not null or to_regclass('public.reviews_fan_user_id_idx') is not null then
    raise exception 'Duplicate indexes remain';
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.performance_settings'::regclass and conname='performance_settings_period_fkey' and convalidated) then
    raise exception 'Validated performance/period relation missing';
  end if;
  begin
    update public.arte_musical_application_period set end_time=start_time where musical_name='toctoc';
    raise exception 'Zero-length booking period accepted';
  exception when check_violation then null; end;
  begin
    insert into public.reviews(musical_id,user_name,content,rating) values ('toctoc','structure-test','rollback fixture',6);
    raise exception 'Invalid review rating accepted';
  exception when check_violation then null; end;
  insert into public.performance_settings(musical_id,details) values ('toctoc','{}'::jsonb) on conflict(musical_id) do nothing;
  begin
    delete from public.arte_musical_application_period where musical_name='toctoc';
    raise exception 'Referenced period deleted';
  exception when foreign_key_violation then null; end;
  -- Historic large bookings remain valid; the 10-seat cap belongs to the booking RPC.
  insert into public.toctoc_bookings(name,student_id,seat_grade,selected_seats,status)
    values ('structure-test','DBTEST','VIP',array(select 'test-'||n from generate_series(1,11) n),'cancelled');
  if has_column_privilege('authenticated','public.profiles','is_presale_user','UPDATE')
    or has_column_privilege('authenticated','public.profiles','is_admin','UPDATE')
    or has_function_privilege('anon','public.book_musical_seats(text,text,text,text,text[],text,uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.book_musical_seats(text,text,text,text,text[],text,uuid)','EXECUTE') then
    raise exception 'Role/booking write permissions broadened';
  end if;
end $$;
rollback;
select 'PASS: constraints, owner/date indexes, duplicate removal, FK restriction, historical compatibility and permissions; fixtures rolled back' as result;
