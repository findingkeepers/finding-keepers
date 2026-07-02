# Finding Keepers

A verified marriage matching platform for HKID holders in Hong Kong. Built with a strong focus on privacy, safety, and manual verification by admins.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend & Database**: Supabase (PostgreSQL + Authentication + Storage)
- **Email**: Resend
- **Deployment**: Vercel

## Environment Variables

Create `.env.local` in the project root:

```env
# Public (browser-safe)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server-only (never expose to the browser)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=Finding Keepers <noreply@yourdomain.com>
ADMIN_NOTIFICATION_EMAIL=admin@yourdomain.com
```

On Vercel, set the same variables for Production. `SUPABASE_SERVICE_ROLE_KEY` is required for rate limiting, admin operations, and signed document URLs.

## Database & Security Setup

Run the full `supabase/setup.sql` in **Supabase Dashboard → SQL Editor**. This includes:

- Phone uniqueness helper
- Auth rate limiting table
- Row Level Security policies
- Profile privilege protection trigger
- Browse-safe CV access rules
- Private `verifications` storage policies

After running SQL, confirm in Supabase Dashboard:

1. **Storage → verifications** bucket is **Private**
2. **Authentication → Email** → enable leaked-password protection if available
3. **RLS** is enabled on `profiles`, `cvs`, `match_requests`, `verification_requests`

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Security Features

- httpOnly session cookies (no auth tokens in localStorage)
- Server-side auth guards on sensitive actions
- Rate limiting on login, signup, reset, and phone checks
- 12-character passwords with breached-password detection
- Private verification documents (admin signed URLs only)
- Middleware route protection for dashboard, browse, and admin

## Project Structure

```
finding-keepers/
├── app/                 # Pages, API routes, server actions
├── components/          # UI components
├── lib/                 # Auth, Supabase, validation helpers
├── supabase/setup.sql   # Database migrations & RLS
└── middleware.ts        # Session refresh + route protection
```