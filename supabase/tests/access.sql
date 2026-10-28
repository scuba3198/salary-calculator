-- Run with psql -v ON_ERROR_STOP=1 -f supabase/tests/access.sql.
begin;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception '%', message; end if;
end $$;
create function pg_temp.expect_denied(statement text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when insufficient_privilege then return;
  end;
  raise exception 'Expected permission denied: %', statement;
end $$;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'migration-test-1@example.invalid', '{}'),
  ('00000000-0000-0000-0000-000000000002', 'migration-test-2@example.invalid', '{}');

insert into public.organizations (id, user_id, name) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Own job'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Other job');
insert into public.attendance (user_id, organization_id, date_str) values
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '2083-1-1');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select pg_temp.assert((select count(*) = 1 from public.user_settings), 'Signup creates own settings');
select pg_temp.assert((select count(*) = 1 from public.organizations), 'Only own organizations visible');
select pg_temp.assert((select count(*) = 0 from public.attendance), 'Other attendance is hidden');
insert into public.attendance (user_id, organization_id, date_str) values
  (auth.uid(), '10000000-0000-0000-0000-000000000001', '2083-1-1');
select pg_temp.assert((select email = 'migration-test-1@example.invalid' from public.attendance), 'Metadata trigger ran');
select pg_temp.expect_denied($q$insert into public.attendance (user_id, organization_id, date_str)
  values (auth.uid(), '10000000-0000-0000-0000-000000000002', '2083-1-2')$q$);
select pg_temp.expect_denied($q$insert into public.organizations (user_id, name)
  values ('00000000-0000-0000-0000-000000000002', 'Forbidden')$q$);
update public.organizations set name = 'Updated' where user_id = auth.uid();
update public.user_settings set theme = 'light' where user_id = auth.uid();
select pg_temp.assert((select name = 'Updated' from public.organizations), 'Owner organization update succeeds');
select pg_temp.assert((select theme = 'light' from public.user_settings), 'Owner settings update succeeds');
select pg_temp.expect_denied($q$update public.organizations
  set user_id = '00000000-0000-0000-0000-000000000002' where user_id = auth.uid()$q$);
select pg_temp.expect_denied($q$update public.user_settings
  set user_id = '00000000-0000-0000-0000-000000000002' where user_id = auth.uid()$q$);
with removed as (delete from public.attendance
  where user_id = '00000000-0000-0000-0000-000000000002' returning *)
select pg_temp.assert((select count(*) = 0 from removed), 'Cannot delete another user attendance');
delete from public.attendance where user_id = auth.uid();
select pg_temp.assert((select count(*) = 0 from public.attendance), 'Can delete own attendance');
reset role;
set local role anon;
select pg_temp.expect_denied('select * from public.attendance');
select pg_temp.expect_denied('select * from public.organizations');
select pg_temp.expect_denied('select * from public.user_settings');
reset role;
set local role service_role;
select pg_temp.assert((select count(*) = 2 from public.organizations), 'Service role access');
reset role;
rollback;
