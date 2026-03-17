import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'LEA Executive Residency',
  description: 'Professional real estate communication platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LEA Executive',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'LEA Executive Residency',
    description: 'Professional real estate communication platform',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0D9488" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then((reg) => console.log('[v0] Service Worker registered'))
                    .catch((err) => console.error('[v0] Service Worker registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
// import type { Metadata, Viewport } from 'next'
// import './globals.css'



// export const viewport: Viewport = {
//   themeColor: '#000000',
//   width: 'device-width',
//   initialScale: 1,
//   maximumScale: 1,
//   userScalable: false,
// }

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return (
//     <html lang="en" suppressHydrationWarning>
//       <head>
//         <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
//         <meta name="apple-mobile-web-app-capable" content="yes" />
//         <meta name="apple-mobile-web-app-status-bar-style" content="default" />
//         <meta name="mobile-web-app-capable" content="yes" />
//       </head>
//       <body>{children}</body>
//     </html>
//   )
// }