'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'

export default function TenantRights() {
  const router = useRouter()
  const lastUpdated = 'June 22, 2026'

  const sections = [
    {
      id: '01',
      title: 'Why this page exists',
      body: [
        'This page sets out, in plain language, what you are entitled to as a tenant at LEA Executive Residency — separate from what the App does. Your tenancy agreement is the binding legal document; this page is a clear summary of the protections that already exist for you under Kenyan law and under our own policies, so you never have to guess at them.',
        'If anything here ever conflicts with your signed tenancy agreement or with Kenyan law, the agreement and the law take precedence. This page does not reduce any right you already have — it exists to make sure you actually know about them.',
      ],
    },
    {
      id: '02',
      title: 'Your right to a habitable home',
      body: [
        'You are entitled to a unit that is structurally safe, has functioning water and electricity connections, and is free from conditions that pose a genuine health or safety hazard.',
        'If a habitability issue arises (no water, electrical fault, structural damage), you have the right to report it and have it addressed within a reasonable time given the nature of the problem. Logging it through the App\u2019s maintenance section creates a timestamped record of when you reported it and how it was resolved.',
      ],
    },
    {
      id: '03',
      title: 'Your right to notice',
      body: [
        'You are entitled to reasonable advance notice before management or maintenance staff enter your unit, except in genuine emergencies (fire, flooding, gas leak, or similar immediate danger).',
        'You are entitled to written notice, in line with your tenancy agreement and Kenyan law, before any change to rent, termination of tenancy, or other material change to your tenancy terms.',
      ],
    },
    {
      id: '04',
      title: 'Your right to your deposit',
      body: [
        'Your security deposit remains your money. It may only be applied against unpaid rent, damage beyond normal wear and tear, or other deductions explicitly provided for in your tenancy agreement.',
        'At the end of your tenancy, you are entitled to an itemized account of any deductions made from your deposit, and to the return of the remaining balance within a reasonable time as set out in your tenancy agreement.',
      ],
    },
    {
      id: '05',
      title: 'Your right to fair treatment',
      body: [
        'You are entitled to be treated without discrimination on the basis of ethnicity, religion, gender, disability, or any other ground protected under Kenyan law.',
        'You are entitled to raise a formal complaint about treatment by management or staff through the App, and to have that complaint reviewed rather than dismissed or ignored.',
      ],
    },
    {
      id: '06',
      title: 'Your right to privacy',
      body: [
        'Your private conversations with management through the App are visible only to you and your assigned property manager — not to other tenants, and not used for anything beyond managing your tenancy.',
        'Your personal data is handled according to our Privacy Policy and the Kenya Data Protection Act, 2019. You can read exactly what we collect and why there.',
      ],
    },
    {
      id: '07',
      title: 'Your right to be heard',
      body: [
        'Every maintenance request and formal complaint you submit through the App is logged with a timestamp and a status you can track — submitted, in progress, resolved. You are entitled to know the status of something you raised; you should never have to wonder if it was seen.',
        'If you feel a request or complaint has not been adequately addressed, you have the right to escalate it directly with management beyond the App.',
      ],
    },
    {
      id: '08',
      title: 'Your right to clear payment records',
      body: [
        'You are entitled to an accurate, accessible record of every rent payment you have made, including the M-Pesa transaction code, amount, and date. This history is preserved in your dashboard for as long as your tenancy continues.',
        'If a payment dispute arises, you have the right to have your M-Pesa transaction code investigated and reconciled rather than dismissed.',
      ],
    },
    {
      id: '09',
      title: 'What we ask of you in return',
      body: [
        'Pay rent on time, according to your tenancy agreement.',
        'Treat other residents, management, and staff with respect.',
        'Report habitability issues promptly rather than letting them worsen.',
        'Use the App and community channel honestly — false complaints or requests undermine the system for everyone.',
      ],
    },
    {
      id: '10',
      title: 'If you feel a right here hasn\u2019t been honored',
      body: [
        'Raise it with management directly through the App\u2019s chat or formal complaint feature first — most issues are resolved fastest this way, and it puts your concern on record immediately.',
        'If you feel it hasn\u2019t been resolved appropriately, you may escalate the matter through the legal channels available to all tenants under Kenyan law, separate from anything in the App.',
      ],
    },
    {
      id: '11',
      title: 'Contact',
      body: [
        'Questions about your rights as a tenant can be directed to management via the Contact page, or by calling +254 748 333 763.',
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
          onClick={() => window.open('/legal/lea-executive-tenant-rights.pdf', '_blank')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 999,
            background: '#ff5a36', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 550,
          }}>
          <Download size={14} /> Download PDF
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '80px 32px 140px' }}>
        <div style={{ width: 50, height: 2, backgroundColor: '#ff5a36', marginBottom: 32 }} />
        <div style={{ fontSize: 11, fontWeight: 350, textTransform: 'uppercase', letterSpacing: '0.11px', color: '#516254', marginBottom: 20 }}>
          Last updated {lastUpdated}
        </div>
        <h1 style={{ fontFamily: "'SF Pro Display', 'Helvetica Neue', 'Arial', sans-serif", fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 300, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: 24 }}>
          Tenant Rights
        </h1>
        <p style={{ fontSize: 16, color: '#516254', lineHeight: 1.6, maxWidth: 600, marginBottom: 64 }}>
          What you're entitled to as a resident at LEA Executive Residency, written so you actually know where you stand.
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
          <button onClick={() => router.push('/privacy')} style={{ fontSize: 14, color: '#ff5a36', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}>
            Read the Privacy Policy
          </button>
          <span style={{ color: '#c8d2c8' }}>·</span>
          <button onClick={() => router.push('/terms')} style={{ fontSize: 14, color: '#ff5a36', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}>
            Read the Terms & Conditions
          </button>
        </div>
      </div>
    </div>
  )
}