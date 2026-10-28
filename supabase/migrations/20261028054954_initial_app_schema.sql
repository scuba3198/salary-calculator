-- Fresh-database baseline captured from the live schema on 2026-10-28.
-- Existing projects: follow supabase/README.md before using db push.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.user_settings (
  "email" text,
  "full_name" text,
  "user_id" uuid not null,
  "hourly_rate" numeric,
  "daily_hours" numeric,
  "tds_percentage" numeric,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "theme" text default 'dark'::text,
  PRIMARY KEY (user_id),
  CHECK (theme = ANY (ARRAY['light'::text, 'dark'::text])),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
alter table public.user_settings enable row level security;


create table public.organizations (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text default 'Primary Job'::text not null,
  "hourly_rate" numeric default 0,
  "daily_hours" numeric default 8,
  "tds_percentage" numeric default 1,
  "color" text default '#4F46E5'::text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  CHECK (daily_hours >= 0::numeric AND daily_hours <= 24::numeric),
  CHECK (hourly_rate >= 0::numeric),
  CHECK (tds_percentage >= 0::numeric AND tds_percentage <= 100::numeric),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
alter table public.organizations enable row level security;
CREATE INDEX idx_organizations_user_id ON public.organizations USING btree (user_id);

create table public.attendance (
  "email" text,
  "full_name" text,
  "id" bigint generated always as identity not null,
  "user_id" uuid not null,
  "date_str" text not null,
  "created_at" timestamp with time zone default now(),
  "organization_id" uuid,
  "daily_hours" numeric default 8,
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (user_id, organization_id, date_str),
  CHECK (daily_hours >= 0::numeric AND daily_hours <= 24::numeric)
);
alter table public.attendance enable row level security;
CREATE INDEX idx_attendance_organization_id ON public.attendance USING btree (organization_id);

CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.user_settings (user_id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name;
  return new;
end;
$function$
;
revoke all on function private.handle_new_user() from public, anon, authenticated;

CREATE OR REPLACE FUNCTION private.populate_attendance_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  select email, full_name
  into new.email, new.full_name
  from public.user_settings
  where user_id = new.user_id;
  return new;
end;
$function$
;
revoke all on function private.populate_attendance_metadata() from public, anon, authenticated;

create trigger on_salary_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
create trigger before_attendance_insert before insert on public.attendance
  for each row execute function private.populate_attendance_metadata();

grant usage on schema public to authenticated, service_role;
revoke all on public.user_settings from public, anon, authenticated;
grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update, delete on public.user_settings to service_role;
create policy "own_select" on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own_insert" on public.user_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own_update" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.organizations from public, anon, authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organizations to service_role;
create policy "own_select" on public.organizations
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own_insert" on public.organizations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own_update" on public.organizations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own_delete" on public.organizations
  for delete to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.attendance from public, anon, authenticated;
grant select, insert, delete on public.attendance to authenticated;
grant select, insert, update, delete on public.attendance to service_role;
create policy "own_select" on public.attendance
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own_insert" on public.attendance
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (organization_id is null or exists (select 1 from public.organizations o where o.id = organization_id and o.user_id = (select auth.uid()))));
create policy "own_delete" on public.attendance
  for delete to authenticated
  using ((select auth.uid()) = user_id);
revoke all on sequence public.attendance_id_seq from public, anon, authenticated;
grant usage, select on sequence public.attendance_id_seq to authenticated, service_role;

commit;
