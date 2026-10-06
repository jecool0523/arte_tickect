-- Run in the Supabase SQL editor or execute_sql. Test rows are rolled back.
-- A review sequence value may be consumed; existing data is never changed.
begin;

do $$
declare
  v_function regprocedure;
begin
  foreach v_function in array array[
    'public.create_review(text,text,text,text,integer,text)'::regprocedure,
    'public.delete_review_with_token(bigint,text)'::regprocedure,
    'public.update_profile(uuid,text,text,text)'::regprocedure,
    'public.get_user_email_status(uuid)'::regprocedure,
    'public.delete_account(uuid)'::regprocedure
  ] loop
    if has_function_privilege('anon',v_function,'EXECUTE')
      or has_function_privilege('authenticated',v_function,'EXECUTE')
      or not has_function_privilege('service_role',v_function,'EXECUTE') then
      raise exception 'Unexpected RPC privileges: %',v_function;
    end if;
  end loop;
  if exists (
    select 1 from pg_class
    where oid in ('public.profiles'::regclass,'public.reviews'::regclass)
      and not relrowsecurity
  ) then
    raise exception 'Profile/review RLS must remain enabled';
  end if;
end;
$$;

set local role service_role;

do $$
declare
  v_id bigint;
  v_token text := encode(extensions.gen_random_bytes(32),'hex');
  v_profile_result jsonb;
begin
  select id into strict v_id from public.create_review(
    p_musical_id => 'rent', p_user_name => 'DB readiness test',
    p_deletion_token => v_token, p_content => 'Rollback-only test fixture',
    p_rating => 5, p_image_url => null
  );
  if not exists (
    select 1 from public.reviews r where r.id = v_id
      and r.deletion_token_hash = encode(extensions.digest(v_token,'sha256'),'hex')
      and r.password is null and r.password_hash is null
  ) then
    raise exception 'Token hash storage failed';
  end if;
  if public.delete_review_with_token(v_id,repeat('wrong-token',8)) then
    raise exception 'Wrong token must not delete a review';
  end if;
  if public.delete_review_with_token(v_id,null) then
    raise exception 'Null token must not delete a review';
  end if;
  if not public.delete_review_with_token(v_id,v_token) then
    raise exception 'Correct token must delete its test review';
  end if;
  if public.delete_review_with_token(v_id,v_token) then
    raise exception 'Already deleted review must return false';
  end if;

  begin
    perform public.create_review('rent','DB test','short','test',5,null);
    raise exception 'Invalid input unexpectedly accepted';
  exception when invalid_parameter_value then
    null;
  end;

  v_profile_result := public.update_profile(null,'',null,null);
  if v_profile_result->>'code' is distinct from 'INVALID_DISPLAY_NAME' then
    raise exception 'Profile name validation failed';
  end if;
  v_profile_result := public.update_profile(null,null,'invalid student id',null);
  if v_profile_result->>'code' is distinct from 'INVALID_STUDENT_ID' then
    raise exception 'Profile student ID validation failed';
  end if;
  if (public.get_user_email_status(null)->>'success')::boolean is distinct from false then
    raise exception 'Unknown profile email status must fail safely';
  end if;
end;
$$;

rollback;
select 'PASS: token RPCs, profile validation, server-only permissions, RLS; fixtures rolled back' as result;
