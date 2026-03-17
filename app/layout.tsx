import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LEA Executive Residency',
  description: 'Professional real estate communication platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LEA Executive',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'LEA Executive Residency',
    description: 'Professional real estate communication platform',
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
        {children}
        <Analytics />
        {/* ✅ Only register SW in production — fixes 404 in dev */}
        {process.env.NODE_ENV === 'production' && (
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