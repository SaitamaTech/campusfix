# CampusFix

CampusFix helps university communities report campus infrastructure problems, verify incidents, and follow their progress through an administrative resolution workflow.

## Features

- Student registration, authentication, and onboarding
- Campus incident submissions with category, severity, and optional GPS coordinates
- Community incident verification and confidence indicators
- Report discovery, personal report history, and status timelines
- Campus administrator triage and status updates
- Notifications for incident status changes
- Supabase row-level security and database-backed workflow counters

## Requirements

- Node.js 20 or newer
- A Supabase project

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set your Supabase project URL and anon key. Keep service-role keys server-only.

3. Apply the SQL migrations in `supabase/migrations/` to your Supabase project in filename order. Connecting Supabase to Vercel does not apply database migrations automatically. Run `0005` through `0009` as five separate queries, in order, after `0001` through `0004`.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run build
```

Campus locations and exact map coordinates are institution-specific. Configure verified campus locations in Supabase before relying on GPS-based map context in a live deployment.

## University directory

Migrations `0005`–`0009` import a pinned snapshot of the community-maintained [Hipo university directory](https://github.com/Hipo/university-domains-list/tree/80e101ad7f77ef24f65d5c2bc6f22f88e85d21b3): 10,254 deduplicated name/country entries across 201 country labels. Run each file as a separate query, in numeric order, to stay within the Supabase SQL Editor size limit. These migrations are safe to retry if a query fails partway through. This is a useful starting directory, not a complete or authoritative list of accredited institutions. Some records do not include state or city data, and those fields are marked “Not specified.” The dataset's MIT license is included at [supabase/third-party/HIPO-LICENSE.txt](supabase/third-party/HIPO-LICENSE.txt).

For imported campuses, the first account with a Supabase-confirmed email matching one of the listed institutional domains is automatically made campus admin. This confirms control of an email address, not employment or institutional authorization. Review the campus and domain before relying on admin actions in a production deployment; a super admin can reassign campus administration.
