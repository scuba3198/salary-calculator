# Database setup

This repo owns only its app's tables. The fresh-database baseline includes explicit
Data API grants, RLS policies, constraints, indexes, and required database functions
and triggers. It contains no production data. Supabase manages the auth and storage
schemas.

## Fresh local database

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
and a Docker-compatible runtime, then run from the repository root:

```sh
supabase start
supabase db reset --local
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/access.sql
```

The SQL test runs in a transaction and rolls back its test users and data. It checks
successful access as the owner, rejected cross-user access, denied anonymous access
where appropriate, and service-role access. Run it against a disposable local database.

For a new hosted project with no app tables, link to that project, review
`supabase db push --dry-run`, and apply with `supabase db push`. Configure the app's
Supabase URL, publishable/anon key, and auth redirect URLs for that project.

## Existing deployed database

This is a fresh-install baseline, not a production upgrade. Do not run it against
an existing app database: the tables already exist. Existing tables keep their
permissions through the October 30, 2026 change.

Before adopting CLI deployment for an existing project, compare its schema and
migration history with this baseline, reconcile any differences, and mark the
baseline as applied with `supabase migration repair --status applied <version>`
only once they match. Inspect `supabase migration list --linked` and
`supabase db push --dry-run` first. Never reset the linked production database.

For every future table, include only the grants the app needs, enable RLS, and add
ownership policies in the same migration. RLS and grants are both required; never
fix a permission error by disabling RLS or exposing a service-role key in the app.

## Salary Calculator details

Includes user settings, organizations, attendance, the signup trigger that creates
settings, and the attendance metadata trigger. Attendance can reference only the
signed-in user's organizations. Authenticated users can read, insert, and delete
attendance; settings and organizations have the operations their app needs.

The old `migrations/fix_date_month_indexing.sql` script is a one-time data repair
for old installations. It is not part of fresh setup and must not be replayed on
new data. Its backup table is not an app API table and needs no public grant.
