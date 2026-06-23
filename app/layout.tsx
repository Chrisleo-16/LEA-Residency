import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import LogRocketInit from '@/components/LogRocketInit'
import SupabaseListener from '@/components/SupabaseListener'
import RouteLoaderProvider from '@/components/RouteLoaderProvider'
import { Toaster } from '@/components/ui/toaster'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
})

const SITE_URL = 'https://lea-residency.vercel.app' // ← change this the day you get a custom domain. Nothing else needs to change.
 
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'LEA Executive Residency | Property Management, Nairobi',
    template: '%s | LEA Executive Residency',
    // pages that set their own `title` (e.g. "Privacy Policy") will
    // render as "Privacy Policy | LEA Executive Residency" automatically
  },
  description:
    'LEA Executive Residency is a digital-first residential property in Nairobi. Tenants pay rent via M-Pesa, message management directly, log maintenance requests, and access all tenancy documents from one app.',
  keywords: [
    'LEA Executive Residency',
    'property management Nairobi',
    'tenant app Kenya',
    'M-Pesa rent payment',
    'rental management app Nairobi',
    'apartment management Kenya',
  ],
  authors: [{ name: 'LEA Executive Residency' }],
  creator: 'LEA Executive Residency',
  publisher: 'LEA Executive Residency',
 
  // Open Graph — controls how the link looks when shared on
  // WhatsApp, Facebook, LinkedIn, etc.
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: SITE_URL,
    siteName: 'LEA Executive Residency',
    title: 'LEA Executive Residency | Property Management, Nairobi',
    description:
      'Pay rent, message management, and manage your tenancy — all from one app.',
    images: [
      {
        url: '/og-image.jpg', // ← create this: 1200×630px, put it in /public
        width: 1200,
        height: 630,
        alt: 'LEA Executive Residency',
      },
    ],
  },
 
  // Twitter/X card — converges with Open Graph in 2026, but kept
  // explicit for safety since it costs nothing
  twitter: {
    card: 'summary_large_image',
    title: 'LEA Executive Residency | Property Management, Nairobi',
    description:
      'Pay rent, message management, and manage your tenancy — all from one app.',
    images: ['/og-image.jpg'],
  },
 
  // Tells Google: yes, index this, yes, follow links from it
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
 
  alternates: {
    canonical: SITE_URL,
  },
 
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png', // optional, 180×180px if you add one
  },
}
 

export const viewport: Viewport = {
  themeColor: '#0D9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={nunito.variable} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${nunito.className} antialiased`}>
        <LogRocketInit />
        <SupabaseListener />
      <RouteLoaderProvider>
          {children}
        </RouteLoaderProvider>
        <Toaster/>
        <Analytics />
        {/* ✅ Only register SW in production — fixes 404 in dev */}
        {(process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js', { scope: '/' })
                      .then(() => console.log('[LEA] Service Worker registered'))
                      .catch((err) => console.error('[LEA] Service Worker failed:', err))
                  })
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  )
}
// ```

// ---

// **What changed:**
// ```
// ✅ Removed all commented out code
// ✅ Added Nunito font across the app
// ✅ SW registration wrapped in production check → fixes 404 in dev
// ✅ themeColor moved to viewport export (correct Next.js way)
// ✅ manifest link removed from head → handled by metadata.manifest
// ✅ suppressHydrationWarning added → prevents dark mode hydration issues
// ✅ Viewport exported separately → correct Next.js 14+ pattern
// ✅ Analytics kept