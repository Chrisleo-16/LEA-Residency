# LEA Executive Residency

A Kenyan property platform that is two things at once: a dedicated digital
portal for LEA Executive Residency's own tenants and landlord, and a growing
marketplace where other Kenyan landlords list properties and prospective
tenants browse before they move in.

## What this is

**For LEA Executive Residency (the flagship building):**
- Real-time chat between tenants and property management
- M-Pesa rent payments with automatic ledger reconciliation
- Maintenance requests, formal complaints, and service request tracking
- Community group chat and management announcements
- Policy & document publishing (house rules, tenancy agreements)
- Landlord subscription billing
- A dashboard **Overview** tab with portfolio stats and a property table

**For the wider market:**
- A property **Listings** marketplace — landlords across Kenya create
  listings, tenants search and browse them, independent of any one building
- Public-facing listings showcase on the landing page

## Tech stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4, CSS custom-property token system with
  light/dark mode (via `next-themes`), amber accent
- **UI**: shadcn/ui + Lucide React icons
- **Backend**: Supabase (Postgres, Auth, Realtime, Storage, Row Level Security)
- **Payments**: M-Pesa (STK Push, Paybill webhook reconciliation)
- **PWA**: Service Worker, Web App Manifest, push notifications

## Design system

The app uses a CSS variable token system (`app/globals.css`) rather than
hardcoded colors, so components respond to the theme toggle automatically:

| Token | Light mode | Dark mode |
|---|---|---|
| `--background` | White | Near-black (`#0f0f0f`) |
| `--foreground` | Near-black | Warm white |
| `--accent` / `--primary` | Amber (`#f59e0b`) | Amber (`#f59e0b`) |

Toggle theme with the `ThemeToggle` component (`components/theme-toggle.tsx`),
built on `next-themes` with `attribute="class"`. New components should use
semantic classes (`bg-background`, `text-foreground`, `bg-accent`,
`border-border`, etc.) instead of hardcoded Tailwind color shades, so they
stay theme-aware.

The public landing page (`components/layout/LandingPage.tsx`) and the
`/login` screen keep their own fixed dark/gold luxury brand styling
independent of the toggle — a deliberate choice, same as most marketing
pages.

## Project structure

```
├── app/
│   ├── dashboard/           # Authenticated app shell (role-routed)
│   ├── listings/            # Public + authenticated listings marketplace
│   ├── login/, onboarding/, complete-setup/
│   ├── api/                 # Route handlers: billing, mpesa, sms, community,
│   │                          maintenance, complaints, requests, staff, etc.
│   └── globals.css          # Design tokens, light/dark theme
├── components/
│   ├── layout/               # Sidebar, DashboardLayout, LandingPage, Navbar
│   ├── pages/                 # OverviewPage, PaymentsPage, ComplaintsPage, ...
│   ├── listings/              # ListingCard, CreateListingDialog
│   ├── chat/, settings/, billing/, pwa/
│   └── theme-provider.tsx, theme-toggle.tsx
├── lib/
│   ├── supabase/             # Client/server Supabase helpers
│   └── engines/               # M-Pesa, USSD, financial, offline-queue engines
├── supabase/migrations/       # Postgres schema & RLS policies
└── public/                    # PWA manifest, icons, offline fallback
```

## Getting started

### Prerequisites
- Node.js 18+
- A Supabase project (Auth + Postgres + Storage enabled)

### Setup

```bash
npm install
```

Create `.env.local` with your Supabase project keys:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the Supabase migrations in `supabase/migrations/` (via the Supabase SQL
editor or `supabase migration up`), including
`20260702_create_listings_table.sql` for the Listings marketplace.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo mode

Visit `/login?demo=true` to try a sandboxed demo dashboard
(`/demo/dashboard`) without a real Supabase account.

## Roadmap: Kenyan AI real estate features

The next major phase layers AI on top of the marketplace to address gaps
specific to the Kenyan property market:

1. **Fraud & verification** ✅ *shipped* — landlords submit an ID document
   for review (`Settings → Landlord Verification`); developers approve/reject
   from `/developer-dashboard/verifications`, which flips `profiles.kyc_verified`.
   Verified listings show a green badge. Listings also get a rule-based
   fraud-risk flag (price far below comparable listings, minimal description,
   or a brand-new account posting several listings at once) — no AI model
   yet, just honest heuristics on real data.
2. **Pricing transparency** — AI-estimated fair rent by location and size,
   since no standardized pricing data source exists for Kenya today
3. **Smart matching & search** — match tenants to listings by budget,
   commute, and needs instead of an unfiltered list
4. **Property management automation** — AI-assisted rent tracking,
   maintenance triage, and tenant communication

## License

Provided as-is for LEA Executive Residency and its Kenyan real estate
platform.
