# CampusFix Database Setup Guide

CampusFix uses **Supabase PostgreSQL**, **Supabase Auth**, and **Supabase Storage**.

## 1. Create a Supabase Project

1. Create a new project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Copy your **Project URL**, **Anon Public Key**, and **Service Role Key** from **Project Settings -> API**.
3. Create `.env.local` from `.env.example` and populate:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000` locally, or your Vercel domain in production)

## 2. Run SQL Migrations

Run the migration scripts in order inside the Supabase **SQL Editor** (or via `supabase db push` if using the Supabase CLI):

1. `supabase/migrations/0001_initial_schema.sql` — Creates all 14 core tables (`universities`, `campus_settings`, `profiles`, `departments`, `campus_locations`, `incident_categories`, `incidents`, `incident_images`, `incident_verifications`, `incident_updates`, `incident_assignments`, `incident_flags`, `notifications`, `audit_logs`), foreign keys, constraints, and indexes.
2. `supabase/migrations/0002_rls_policies.sql` — Enables Row Level Security on every table, creates role helper functions, creates the `handle_new_user()` auth trigger (hardcoding new registrations to `student`), guards sensitive profile columns against privilege escalation, and defines the `get_public_campus_stats` aggregate RPC.
3. `supabase/migrations/0003_storage_and_seed.sql` — Creates the private `incident-evidence` storage bucket (5 MB max, JPEG/PNG/WebP), storage RLS policies, and initial seed data for **University of Ilesa (`unilesa`)**, 7 default departments, and 12 core incident categories.
4. `supabase/migrations/0004_workflow_triggers.sql` — Adds incident workflow triggers and related database safeguards.
5. `supabase/migrations/0005_dashboard_metrics.sql` — Adds student and campus dashboard metric functions.
6. `supabase/migrations/0006_super_admin_dashboard.sql` — Adds platform dashboard metrics and recent report data.
7. `supabase/migrations/0007_admin_controls_and_announcements.sql` — Adds platform announcements, campus-scoped operations metrics, and audited Super Admin account role/status controls.
8. `supabase/migrations/0008_report_media_integrity.sql` — Restricts report image metadata to report owners and authorized resolution uploads, and extends secure campus-scoped storage uploads.
9. `supabase/migrations/0009_incident_workflow.sql` — Adds the reopened lifecycle status, admin submission notifications, and an atomic campus-scoped RPC for report status changes, department assignments, and internal notes.

The admin console also provides department and location management and campus settings. Announcements are readable by authenticated users; only Super Admins can publish them or manage accounts. Apply all migrations in filename order before deploying the matching application code.

> **Important Note on Campus Coordinates:** No University of Ilesa GPS coordinates are invented or hardcoded. `campus_settings.map_configured` starts as `false` with `NULL` coordinates until an authorized administrator configures verified campus coordinates and boundaries.

## 3. Configure Supabase Authentication

In **Authentication -> URL Configuration**:

- Set **Site URL** to `http://localhost:3000` (or your deployed URL).
- Add **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`
  - `http://localhost:3000/reset-password`
  - (Plus your production Vercel URL equivalents)

In **Authentication -> Providers -> Email**:
- Ensure **Confirm email** is enabled for production student onboarding.

To enable Google sign-in:

1. Enable **Google** under **Authentication -> Providers** in Supabase and enter the OAuth client ID and secret from Google Cloud.
2. In Google Cloud, add the Supabase project's callback URL shown in the provider settings (usually `https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI.
3. Add `http://localhost:3000/auth/callback` and your deployed site's `/auth/callback` URL to Supabase's allowed redirect URLs.

## 4. Promote the First Super Administrator

Public registration strictly creates `student` accounts and ignores any client-supplied role values. To promote an initial Super Administrator after they register and confirm their email, run in the Supabase SQL Editor:

```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'admin@unilesa.edu.ng';
```

From the Super Admin console, you can then create or promote Campus Administrators for specific universities.
