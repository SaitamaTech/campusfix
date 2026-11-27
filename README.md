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

3. Apply the SQL migrations in `supabase/migrations/` to your Supabase project in filename order.

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
