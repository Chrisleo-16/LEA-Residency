'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import {useRouteLoader} from "@/components/RouteLoaderProvider"

export default function TermsAndConditions() {
  const router = useRouter()
  const lastUpdated = 'June 22, 2026'
  const { startLoading } = useRouteLoader()

  const sections = [
    {
      id: '01',
      title: 'Acceptance of these terms',
      body: [
        'These Terms and Conditions ("Terms") govern your use of the LEA Executive Residency tenant application ("the App"), provided by LEA Executive Residency ("LEA Executive", "we", "us"). By creating an account or using the App, you agree to these Terms.',
        'The App is available only to current tenants of LEA Executive Residency. Accounts are issued by management , you cannot self-register.',
      ],
    },
    {
      id: '02',
      title: 'What the App is and is not',
      body: [
        'The App is a communication and record-keeping tool between you and LEA Executive Residency management. It lets you message management, submit maintenance requests and complaints, view policies and documents, and pay rent via M-Pesa.',
        'The App is not a rental listing platform, a marketplace, or a party to your tenancy agreement. Your tenancy agreement with LEA Executive Residency governs the legal terms of your occupancy; these Terms govern only your use of the App itself.',
        'Nothing in the App constitutes legal, financial, or tax advice.',
      ],
    },
    {
      id: '03',
      title: 'Your account',
      body: [
        'You are responsible for keeping your login credentials confidential and for all activity that occurs under your account.',
        'Notify management immediately if you suspect unauthorized access to your account.',
        'You must provide accurate information when setting up your profile, including your correct phone number and M-Pesa details, so that payments and notifications reach you correctly. We are not responsible for misdirected payments or notifications resulting from inaccurate information you provided.',
      ],
    },
    {
      id: '04',
      title: 'Rent payments',
      body: [
        'Rent payments made via M-Pesa Paybill or STK Push through the App go directly to the landlord\u2019s registered Paybill account. LEA Executive does not hold or have custody of tenant funds at any point in the transaction.',
        'The App displays payment status based on confirmation data received from Safaricom\u2019s M-Pesa systems. While we work to reflect payments in real time, delays or errors on Safaricom\u2019s side are outside our control. If a payment you made does not appear in your dashboard within a reasonable time, contact management with your M-Pesa transaction code so it can be manually verified and reconciled.',
        'You remain responsible for paying rent on time according to your tenancy agreement regardless of any technical issue with the App. The App is a convenience tool, not a substitute for your contractual payment obligations.',
      ],
    },
    {
      id: '05',
      title: 'Acceptable use',
      body: [
        'You agree not to use the App to harass, threaten, or abuse other residents or staff, including in the community channel.',
        'You agree not to submit false maintenance requests, false complaints, or knowingly false information of any kind.',
        'You agree not to attempt to access another tenant\u2019s account, data, or private messages, or to interfere with the App\u2019s normal operation, including through automated scraping or attempts to bypass security controls.',
        'Management may suspend or restrict App access for violations of this section, without affecting your underlying tenancy agreement, which is governed separately.',
      ],
    },
    {
      id: '06',
      title: 'Maintenance requests and complaints',
      body: [
        'Submitting a maintenance request or complaint through the App creates a timestamped record but does not guarantee a specific resolution time. Response times depend on the nature of the issue, availability of contractors, and circumstances outside our control.',
        'Urgent safety issues (gas leaks, electrical hazards, fire, flooding) should be reported by phone immediately in addition to logging them in the App, since the App is not a monitored emergency line.',
      ],
    },
    {
      id: '07',
      title: 'Content you submit',
      body: [
        'You retain ownership of messages, documents, and content you submit through the App. By submitting it, you grant LEA Executive a license to store, process, and share it internally as needed to operate the App and manage your tenancy.',
        'You are responsible for the accuracy and legality of anything you submit. Do not upload content that is defamatory, unlawful, or infringes on someone else\u2019s rights.',
      ],
    },
    {
      id: '08',
      title: 'Availability and changes to the App',
      body: [
        'We aim to keep the App available and functioning, but we do not guarantee uninterrupted access. The App may be unavailable from time to time for maintenance, updates, or due to issues with third-party services (such as Supabase or Safaricom\u2019s APIs) that are outside our control.',
        'We may update, modify, or discontinue features of the App at our discretion, with reasonable notice to residents where the change is material.',
      ],
    },
    {
      id: '09',
      title: 'Limitation of liability',
      body: [
        'To the maximum extent permitted under Kenyan law, LEA Executive is not liable for indirect, incidental, or consequential damages arising from your use of the App, including delays or failures in third-party payment or messaging systems.',
        'Nothing in these Terms limits liability for death, personal injury, or fraud, or any liability that cannot be excluded under Kenyan law.',
        'Our total liability arising from your use of the App, where liability is established, is limited to the amount of one month\u2019s rent under your tenancy agreement.',
      ],
    },
    {
      id: '10',
      title: 'Termination',
      body: [
        'Your access to the App ends when your tenancy ends, or earlier if management suspends your account for a violation of these Terms.',
        'Ending your access to the App does not affect any rights or obligations that already arose under your separate tenancy agreement.',
      ],
    },
    {
      id: '11',
      title: 'Governing law',
      body: [
        'These Terms are governed by the laws of Kenya. Any dispute arising from your use of the App that cannot be resolved directly with management is subject to the exclusive jurisdiction of the courts of Nairobi, Kenya.',
      ],
    },
    {
      id: '12',
      title: 'Changes to these Terms',
      body: [
        'We may update these Terms from time to time. Material changes will be communicated through the App before taking effect. Continued use of the App after changes take effect constitutes acceptance of the updated Terms.',
      ],
    },
    {
      id: '13',
      title: 'Contact',
      body: [
        'Questions about these Terms can be directed to management via the Contact page, or by contacting tel +254799956574.',
      ],
    },
  ]

  return (
    <div style={{ backgroundColor: '#fafffa', color: '#121613', minHeight: '100vh', fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { background: #fafffa; }
      `}</style>

      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#fafffa', borderBottom: '1px solid #eef2ef', padding: '20px 50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#516254' }}>
          <ArrowLeft size={16} /> Back to LEA Executive
        </button>
        <button
          onClick={() => window.open('/legal/lea-executive-terms-and-conditions.pdf', '_blank')}
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
          Terms & Conditions
        </h1>
        <p style={{ fontSize: 16, color: '#516254', lineHeight: 1.6, maxWidth: 600, marginBottom: 64 }}>
          The rules for using the LEA Executive Residency tenant app , written so you can actually understand them.
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
          <button onClick={() => { startLoading(); router.push('/privacy')}} style={{ fontSize: 14, color: '#c9a96e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}>
            ← Read the Privacy Policy
          </button>
        </div>
      </div>
    </div>
  )
}