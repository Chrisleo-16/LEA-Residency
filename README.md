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
- **Tenant Wishlist reverse-matchmaking** ("Pitch My Room") — a tenant
  broadcasts budget, neighborhoods, move-in date and must-have amenities;
  landlords with a matching vacant listing get an SMS + push notification and
  can pitch their room in-app from a **Tenant Leads** dashboard tab; matched
  tenants get one curated SMS digest each evening instead of being contacted
  by every interested landlord individually

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

Light mode is the default for new sessions (`defaultTheme="light"` in
`app/layout.tsx`); users can switch with the `ThemeToggle` component
(`components/theme-toggle.tsx`), built on `next-themes` with
`attribute="class"`. New components should use
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
│   ├── login/, complete-setup/   # Single personalized landlord setup wizard
│   ├── api/                 # Route handlers: billing, mpesa, sms, community,
│   │                          maintenance, complaints, requests, staff,
│   │                          wishlist (reverse-matchmaking + pitches), etc.
│   ├── api/cron/             # Scheduled jobs: billing, wishlist-digest
│   └── globals.css          # Design tokens, light/dark theme (light by default)
├── components/
│   ├── layout/               # Sidebar (focus-area personalized), DashboardLayout,
│   │                          LandingPage, Navbar
│   ├── pages/                 # OverviewPage, PaymentsPage, ComplaintsPage,
│   │                          LeadsPage (tenant wishlist matches), ...
│   ├── listings/              # ListingCard, CreateListingDialog
│   ├── wishlist/               # WishlistDialog (tenant house-hunting form)
│   ├── onboarding/             # FocusAreaPicker (setup + Settings personalization)
│   ├── chat/, settings/, billing/, payments/, pwa/
│   └── theme-provider.tsx, theme-toggle.tsx
├── lib/
│   ├── supabase/             # Client/server Supabase helpers
│   ├── focusAreas.ts          # Landlord sidebar personalization mapping
│   └── engines/               # M-Pesa, USSD, financial, offline-queue engines
├── supabase/migrations/       # Postgres schema & RLS policies
├── docs/                      # LEA-Revenue-Model.pdf and other internal docs
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

Run every file in `supabase/migrations/` against your project, in filename
order. Some historical migrations don't match the Supabase CLI's strict
`<timestamp>_name.sql` naming convention, so `supabase migration up` /
`supabase db push` will silently skip them — the reliable path is either the
Supabase SQL editor, or `supabase db query --linked -f <file>` per file.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo mode

Visit `/login?demo=true` to try a sandboxed demo dashboard
(`/demo/dashboard`) without a real Supabase account.

## Landlord setup & personalization

New landlords go through a single short wizard at `/complete-setup`:
property name → unit count → **"what do you want LEA to help you with"**
(focus areas) → an optional/skippable payment channel. That focus-area
choice becomes their sidebar — `components/layout/Sidebar.tsx` only shows
the sections they picked (plus chat, community and billing, which are
always on), falling back to the full menu when no preference is set. Both
the sidebar menu and the payment channels can be revisited any time from
**Settings**, which reuses the same `FocusAreaPicker` and
`PaymentChannelSetup` components. `middleware.ts` gates dashboard access on
the landlord's real setup fields (`landlord_code`, `landlord_block_id`,
`property_setup_complete`) — there is intentionally only one setup flow now.

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
3. **Smart matching & search** 🟡 *partially shipped* — the Tenant Wishlist
   reverse-matchmaking system already matches by budget, bedroom count, and
   neighborhood (rule-based, in `app/api/wishlist/route.ts`). Still open:
   amenity-weighted ranking, commute-based matching, and a tenant-facing
   portal to browse pitches beyond the SMS digest.
4. **Property management automation** — AI-assisted rent tracking,
   maintenance triage, and tenant communication

## Revenue model

See [`docs/LEA-Revenue-Model.pdf`](docs/LEA-Revenue-Model.pdf) for the full
breakdown. Short version: landlords pay a recurring subscription billed
automatically via M-Pesa STK push, priced cost-plus (1.8× the real PayHero
transaction cost of collecting their rent, or a flat per-tier floor —
whichever is greater); landlords can also pay a flat fee to feature a
listing on the marketplace (KES 300/7 days or KES 600/14 days), currently
reconciled manually rather than via automatic STK push.

## License

Provided as-is for LEA Executive Residency and its Kenyan real estate
platform.
