# Finding Keepers

A verified marriage matching platform for HKID holders in Hong Kong. Built with a strong focus on privacy, safety, and manual verification by admins.

## Overview

Finding Keepers allows verified users to create profiles and request matches. All matches are personally facilitated by admins to ensure trust and safety. The platform is currently in its foundational stage.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend & Database**: Supabase (PostgreSQL + Authentication)
- **Form Management**: react-hook-form + Zod
- **Notifications**: Sonner
- **Deployment**: Vercel

## Current Features (MVP)

- User registration with basic information
- Email verification
- Login system
- Protected dashboard routes
- Clean and professional UI

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/findingkeepers/finding-keepers.git
cd finding-keepers
```
### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a file named .env.local in the root folder and add the following:

envNEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

### 4. Run the development server
```bash
npm run dev
```
Open http://localhost:3000 in your browser.

## Project Structure
textfinding-keepers/
├── app/                    # Main application pages
├── src/
│   ├── app/(auth)/         # Login and Register pages
│   ├── lib/                # Supabase client configuration
│   └── components/         # Reusable UI components
├── middleware.ts           # Route protection
├── README.md
├── package.json
└── .env.local              # Environment variables (not committed)

## Environment Variables
| Variable | Description | Required |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Public Key | Yes |

## Deployment
This project is ready to be deployed on Vercel.

Recommended Steps:
1. Push your code to GitHub
2. Import the repository on Vercel
3. Add the environment variables in the Vercel dashboard
4. Deploy

## License
This is a private project intended for company use only.


