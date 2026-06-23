'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LandingPage from '@/components/layout/LandingPage'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [])

  return (
    <>
    <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "LEA Executive Residency",
            url: "https://lea-residency.xyz",
            telephone: ["+254748333763", "+254799956574"],
            email: "chrisbenevansleo@gmail.com",
            description:
              "Digital tenant management platform for LEA Executive Residency, a residential property in Nairobi, Kenya. Manage rent payments via M-Pesa, maintenance requests, and communication with property management.",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Nairobi",
              addressCountry: "KE",
            },
            areaServed: {
              "@type": "City",
              name: "Nairobi",
            },
          }),
        }}
      />
  <LandingPage />
    </>
);
}