# VROOM

Automate vendor outreach for event planning. Reduce email back-and-forth by 80%+.

## Features

- **Automated Outreach**: Send personalized emails to vendors
- **Inbox Monitoring**: Auto-parse vendor replies with AI
- **Smart Decisions**: Auto-categorize as Viable, Negotiate, Reject, or Escalate
- **Follow-Up Chain**: Automatic reminders at 3 and 7 days
- **Human Escalation**: Only interrupts for ambiguous cases

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind, shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Email | Gmail API |
| AI | OpenAI GPT-4 |
| Jobs | Inngest |
| Deploy | Vercel |

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure Environment

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-proj-your-key

# Inngest (optional)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

### 3. Set Up Database

Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor.

### 4. Configure Google OAuth

1. **Google Cloud Console** → Create OAuth 2.0 Client
2. Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`
3. **Supabase Dashboard** → Authentication → Providers → Google
4. Enable and paste Client ID/Secret
5. Add yourself as a test user (OAuth consent screen → Test users)

### 5. Run

```bash
npm run dev
```

## Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── events/            # Event management
│   ├── settings/          # User settings
│   └── login/             # Authentication
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── events-list.tsx   # Events grid
│   ├── vendors-table.tsx # Vendor ops table
│   └── vendor-drawer.tsx # Detail view
├── lib/                   # Utilities
│   ├── supabase/         # DB clients
│   ├── gmail/            # Gmail API
│   ├── ai/               # OpenAI parsing
│   └── rules/            # Decision engine
└── inngest/              # Background jobs
    └── functions/        # Automation workflows
```

## User Flow

```
Login → Events List → Create Event → Add Vendors → Start Outreach
                                            ↓
                              Automation monitors inbox
                                            ↓
                              AI parses → Decision made
                                            ↓
                              Auto-respond or Escalate
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/utils.ts` | Shared utilities (formatCurrency, PAGE_CONTAINER_CLASS) |
| `src/components/empty-state.tsx` | Reusable empty state component |
| `src/components/status-badge.tsx` | Status/Decision/Confidence badges |
| `src/lib/gmail/supabase-auth.ts` | Gmail client via Supabase OAuth |
| `src/lib/rules/decision-engine.ts` | Auto-decision logic |

## Troubleshooting

### "Access blocked" on Google sign-in
Add yourself as a test user in Google Cloud Console → OAuth consent screen → Test users.

### Events not saving
Run the database migration in Supabase SQL Editor.

### No nav bar showing
You're not logged in. Clear cookies and try again.

## License

MIT
