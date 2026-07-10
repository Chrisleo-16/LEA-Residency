'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { useRouteLoader } from '@/components/RouteLoaderProvider'

export default function PrivacyPolicy() {
  const router = useRouter()
  const lastUpdated = 'June 22, 2026'
  const {startLoading} = useRouteLoader();

  const sections = [
    {
      id: '01',
      title: 'Who we are',
      body: [
        'LEA Executive Residency ("LEA Executive", "we", "us", "our") operates a residential property in Nairobi, Kenya, and the tenant management application ("the App") used by residents of that property.',
        'We act as both the landlord/property manager of LEA Executive Residency and the provider of the App\u2019s underlying software. This policy explains what we collect through the App, why we collect it, and what rights you have over it.',
      ],
    },
    {
      id: '02',
      title: 'What we collect',
      body: [
        'Account information: your name, phone number, email address, profile photo, and unit number.',
        'Payment-related information: M-Pesa transaction codes, payment amounts, payment dates, and confirmation status. We receive this directly from Safaricom\u2019s M-Pesa APIs when you pay rent , we do not collect your M-Pesa PIN, and we never see your full M-Pesa account details beyond what Safaricom discloses in a transaction confirmation.',
        'Communications: messages sent through the in-app chat with management, posts in the community channel, maintenance requests, and formal complaints, including their timestamps and status history.',
        'Documents: signed tenancy agreements and any files you upload in connection with a request or complaint.',
        'Device and usage information: basic technical data such as device type, app version, and crash logs, used only to keep the App running properly.',
      ],
    },
    {
      id: '03',
      title: 'What we do not collect',
      body: [
        'We do not collect your M-Pesa PIN, bank login credentials, or national ID number unless you voluntarily provide it as part of a tenancy agreement.',
        'We do not access your contacts, photos, or other apps on your device.',
        'We do not sell, rent, or trade your personal data to third parties for marketing purposes , ever.',
      ],
    },
    {
      id: '04',
      title: 'Where your rent money goes',
      body: [
        'When you pay rent via M-Pesa Paybill or STK Push, your payment goes directly to the landlord\u2019s registered Paybill account. LEA Executive does not hold, custody, or have access to move tenant funds at any point.',
        'The App reads payment confirmation data from the M-Pesa API after Safaricom processes the transaction, and logs that confirmation against your account so both you and management see an accurate, real-time record. If a payment does not reflect within a reasonable time, contact management directly , we can look up the transaction status but we are not the custodian of your funds.',
      ],
    },
    {
      id: '05',
      title: 'How we use your information',
      body: [
        'To operate your tenant account and dashboard.',
        'To match and confirm rent payments automatically.',
        'To route your messages, maintenance requests, and complaints to the right person at management.',
        'To send you notifications about payments, replies, status changes, and building announcements.',
        'To maintain a record that protects both you and the landlord in the event of a dispute over payments, requests, or communications.',
        'We do not use your data to build advertising profiles, and we do not use it for any purpose unrelated to your tenancy.',
      ],
    },
    {
      id: '06',
      title: 'Who can see your data',
      body: [
        'Your private messages with management are visible only to you and the assigned property manager. Other tenants cannot see them.',
        'Posts in the community channel are visible to all residents and management, by design , do not post anything there you would not want neighbours to see.',
        'Maintenance requests and complaints are visible to you and management, and may be shared internally with maintenance staff strictly to resolve the issue you raised.',
        'We use Supabase as our database and authentication provider, and rely on Row Level Security so that, at the infrastructure level, tenants cannot query or access another tenant\u2019s private records.',
        'We may disclose information if required by Kenyan law, a valid court order, or to protect the safety of a resident or the property.',
      ],
    },
    {
      id: '07',
      title: 'How long we keep your data',
      body: [
        'We retain your tenancy records, including payment history and signed documents, for as long as your tenancy continues and for a reasonable period afterward to comply with legal, accounting, and dispute-resolution obligations under Kenyan law.',
        'If you stop being a tenant, you may request deletion of your account profile; we will retain payment and document records required for landlord recordkeeping and legal compliance even after account deletion.',
      ],
    },
    {
      id: '08',
      title: 'Your rights',
      body: [
        'Under the Kenya Data Protection Act, 2019, you have the right to know what personal data we hold about you, to request a copy of it, to request correction of inaccurate data, and to request deletion of data we are not legally required to retain.',
        'To exercise any of these rights, contact management using the details at the end of this policy. We will respond within a reasonable time and in line with our obligations under Kenyan law.',
      ],
    },
    {
      id: '09',
      title: 'Security',
      body: [
        'We use industry-standard measures including encrypted connections (HTTPS/TLS), authenticated access, and database-level access controls (Row Level Security) to protect your data.',
        'No system is perfectly secure. If we become aware of a data breach affecting your personal information, we will notify you and the relevant authority as required by Kenyan law.',
      ],
    },
    {
      id: '10',
      title: 'Changes to this policy',
      body: [
        'We may update this policy as the App or our practices change. If we make material changes, we will notify residents through the App before the changes take effect. The "last updated" date at the top of this page always reflects the current version.',
      ],
    },
    {
      id: '11',
      title: 'Contact',
      body: [
        'Questions about this policy or your data can be sent to management via the contact details on our Contact page, or by calling +254799956574.',
      ],
    },
  ]

  return (
    <div style={{ backgroundColor: '#fafffa', color: '#121613', minHeight: '100vh', fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { background: #fafffa; }
        details summary::-webkit-details-marker { display: none; }
      `}</style>

      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#fafffa', borderBottom: '1px solid #eef2ef', padding: '20px 50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#516254' }}>
          <ArrowLeft size={16} /> Back to LEA Executive
        </button>
        <button
          onClick={() => window.open('/legal/lea-executive-privacy-policy.pdf', '_blank')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 999,
            background: '#c9a96e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 550,
          }}>
          <Download size={14} /> Download PDF
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '80px 32px 140px' }}>
        <div style={{ width: 50, height: 2, backgroundColor: '#c9a96e', marginBottom: 32 }} />
        <div style={{ fontSize: 11, fontWeight: 350, textTransform: 'uppercase', letterSpacing: '0.11px', color: '#516254', marginBottom: 20 }}>
          Last updated {lastUpdated}
        </div>
        <h1 style={{ fontFamily: "'SF Pro Display', 'Helvetica Neue', 'Arial', sans-serif", fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 300, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: 24 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 16, color: '#516254', lineHeight: 1.6, maxWidth: 600, marginBottom: 64 }}>
          This describes exactly what LEA Executive Residency collects through the tenant app, why, and what control you have over it. No fine print designed to confuse you.
        </p>

        {sections.map(s => (
          <div key={s.id} style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: '#c8d2c8', fontWeight: 500 }}>{s.id}</span>
              <h2 style={{ fontSize: 22, fontWeight: 500, color: '#121613', margin: 0 }}>{s.title}</h2>
            </div>
            <div style={{ paddingLeft: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {s.body.map((p, i) => (
                <p key={i} style={{ fontSize: 15, color: '#516254', lineHeight: 1.7, margin: 0 }}>{p}</p>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid #eef2ef', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() =>{ startLoading(); router.push('/terms')}} style={{ fontSize: 14, color: '#c9a96e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}>
            Read the Terms & Conditions →
          </button>
        </div>
      </div>
    </div>
  )
}