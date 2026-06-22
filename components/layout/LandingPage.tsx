'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, MessageSquare, Receipt, FileText, Wrench,
  Bell, ClipboardList, Users, Shield, Wifi, Car,
  Zap, CheckCircle, ArrowRight, ArrowUpRight,
  Star, Phone, Mail, MapPin, Menu, X
} from 'lucide-react'
import InstallPrompt from '@/components/pwa/InstallPrompt'

interface LuxuryHamburgerMenuProps {
  user: null | any; // can be replaced with actual SupabaseUser type
  currentPage: string;
  onNavigate?: (path: string) => void;
}

const NAV_ITEMS = [
  {
    label: "Properties",
    sub: "Browse our collection",
    path: "properties",
    num: "01",
  },
  {
    label: "Gallery",
    sub: "Virtual property tours",
    path: "gallery",
    num: "02",
  },
  {
    label: "Experiences",
    sub: "Curated stays",
    path: "experiences",
    num: "03",
  },
  { label: "Services", sub: "What we offer", path: "services", num: "04" },
  { label: "Contact", sub: "Get in touch", path: "contact", num: "05" },
];

const IMAGES = [
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=600", // Modern living room
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600", // Luxury kitchen
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=600", // Master bedroom
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=600", // Spa bathroom
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=600", // Rooftop terrace
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600", // Fitness center
];



export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    ['How It Works', 'howitworks'], 
    ['Features', 'features'], 
    ['Gallery', 'gallery'], 
    ['Payments', 'payments'], 
    ['Contact', 'contact']
  ];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  // Dashboard features — exactly what exists in the app
  const features = [
    {
      icon: MessageSquare,
      title: 'Direct Chat with Management',
      desc: 'Tenants get a private messaging channel with the property manager. Ask questions, report issues, get updates — no phone tag, no waiting.',
      color: '#0d9488',
      num: '01',
    },
    {
      icon: Receipt,
      title: 'M-Pesa Rent Payments',
      desc: 'Pay rent directly via M-Pesa. Your payment is logged and confirmed in the system immediately. Landlord gets instant notification.',
      color: '#16a34a',
      num: '02',
    },
    {
      icon: FileText,
      title: 'Policies & Documents',
      desc: 'House rules, tenancy agreements, move-in guidelines — all stored digitally. Read them anytime, sign and download the agreement as a PDF.',
      color: '#2563eb',
      num: '03',
    },
    {
      icon: Wrench,
      title: 'Maintenance Requests',
      desc: 'Submit plumbing, electrical, structural, or cleaning requests with one tap. Track status from submitted → in progress → resolved in real time.',
      color: '#ea580c',
      num: '04',
    },
    {
      icon: ClipboardList,
      title: 'Formal Complaints',
      desc: 'Log complaints with a title, full description, and timestamp. Management reviews and updates status. Everything is on record.',
      color: '#dc2626',
      num: '05',
    },
    {
      icon: Users,
      title: 'Community Group Chat',
      desc: 'A shared group channel for all residents. Management posts announcements, tenants stay informed about building updates and events.',
      color: '#7c3aed',
      num: '06',
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      desc: 'Instant alerts for new messages, payment confirmations, status updates, and community announcements — even when the app is closed.',
      color: '#b45309',
      num: '07',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      desc: 'Your data is protected with Supabase Row Level Security. Only you and your property manager see your personal conversations and records.',
      color: '#0891b2',
      num: '08',
    },
  ]

  // What you see when you log in as a tenant
  const dashboardTabs = [
    { label: 'Chat', icon: MessageSquare, desc: 'Private messages with your landlord' },
    { label: 'Community', icon: Users, desc: 'Group chat & announcements' },
    { label: 'Complaints', icon: ClipboardList, desc: 'Submit & track issues' },
    { label: 'Requests', icon: Wrench, desc: 'Maintenance & service requests' },
    { label: 'Policies', icon: FileText, desc: 'Documents & house rules' },
    { label: 'Settings', icon: Bell, desc: 'Profile & notifications' },
  ]

  const testimonials = [
    {
      name: 'Amina W.',
      role: 'Resident Tenant',
      avatar: 'AW',
      rating: 5,
      text: 'Paying rent through the app is so seamless. I send to the Paybill and a few seconds later it shows confirmed. No more calling to check if it went through.',
    },
    {
      name: 'James M.',
      role: 'Resident Tenant',
      avatar: 'JM',
      rating: 5,
      text: 'I logged a plumbing issue on Monday morning. By Wednesday it was already resolved and marked done in the app. This is how management should work.',
    },
    {
      name: 'Faith N.',
      role: 'Resident Tenant',
      avatar: 'FN',
      rating: 5,
      text: 'The community chat is great. We know immediately when there\'s a water outage or a notice from management. Everyone stays on the same page.',
    },
  ]

  const howItWorks = [
    {
      step: '1',
      title: 'You get an account',
      desc: 'Your property manager registers you in the system. You receive a login link and set up your account in under 2 minutes.',
    },
    {
      step: '2',
      title: 'Set up your profile',
      desc: 'Add your name, photo, and phone number. Link your M-Pesa number so payments can be tracked automatically when you pay rent.',
    },
    {
      step: '3',
      title: 'Manage everything from one place',
      desc: 'Chat with management, pay rent, submit requests, read policies, and stay connected with your building community — all in one app.',
    },
  ]

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", background: '#0a0a0a', color: '#f2ede4', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #0a0a0a; }

        .nav-btn { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; background: none; border: none; cursor: pointer; color: rgba(242,237,228,.55); transition: color .2s; padding: 4px 0; }
        .nav-btn:hover { color: #f2ede4; }

        .btn-gold { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; background: #c9a96e; color: #0a0a0a; border: none; cursor: pointer; padding: 14px 32px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-gold:hover { background: #b8914f; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,169,110,.25); }

        .btn-outline { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; background: transparent; color: #f2ede4; border: 1px solid rgba(242,237,228,.28); cursor: pointer; padding: 13px 32px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-outline:hover { border-color: #c9a96e; color: #c9a96e; }

        .gold-line { width: 44px; height: 1px; background: #c9a96e; margin: 16px 0; }
        .gold-line-center { width: 44px; height: 1px; background: #c9a96e; margin: 16px auto; }
        .sec-label { font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: #c9a96e; }

        .feat-card { background: #131313; border: 1px solid rgba(242,237,228,.07); padding: 36px 32px; transition: border-color .3s, transform .4s cubic-bezier(.16,1,.3,1); }
        .feat-card:hover { border-color: rgba(201,169,110,.25); transform: translateY(-4px); }

        .tab-chip { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .06em; border: 1px solid rgba(242,237,228,.12); background: rgba(242,237,228,.04); padding: 10px 18px; display: flex; align-items: center; gap: 8px; transition: all .25s; }
        .tab-chip:hover { border-color: rgba(201,169,110,.35); background: rgba(201,169,110,.06); color: #c9a96e; }

        .testi-card { padding: 36px; border: 1px solid rgba(242,237,228,.09); transition: border-color .3s; }
        .testi-card:hover { border-color: rgba(201,169,110,.25); }

        .step-num { font-family: 'Cormorant Garamond', serif; font-size: 72px; font-weight: 300; color: rgba(201,169,110,.12); line-height: 1; position: absolute; top: -16px; left: -8px; z-index: 0; }

        .mpesa-badge { background: rgba(22,163,74,.1); border: 1px solid rgba(22,163,74,.25); color: #4ade80; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; padding: 4px 12px; display: inline-flex; align-items: center; gap: 6px; }

        .amen-item { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border: 1px solid rgba(242,237,228,.07); transition: border-color .25s; }
        .amen-item:hover { border-color: rgba(201,169,110,.2); }

        .paybill-box { background: rgba(201,169,110,.07); border: 1px solid rgba(201,169,110,.2); padding: 16px 28px; text-align: center; min-width: 140px; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp .6s ease forwards; }
        .fade-up-1 { animation-delay: .1s; opacity: 0; }
        .fade-up-2 { animation-delay: .25s; opacity: 0; }
        .fade-up-3 { animation-delay: .4s; opacity: 0; }
        .fade-up-4 { animation-delay: .55s; opacity: 0; }

        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .feat-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .tab-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 40px 24px !important; }
          .testi-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .how-grid { grid-template-columns: 1fr !important; gap: 50px !important; }
          .amen-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 40px !important; margin-bottom: 60px !important; }
          .gallery-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .payment-grid { grid-template-columns: 1fr !important; gap: 50px !important; }
          .paybill-row { flex-direction: column !important; align-items: flex-start !important; }
          .hero-ctas { flex-direction: column !important; align-items: flex-start !important; }
          .stats-grid { gap: 40px !important; }
          .section-pad { padding: 80px 24px !important; }
          .section-pad-lg { padding: 100px 24px !important; }
          .footer-pad { padding: 70px 24px 30px !important; }
          .hero-section { padding: 140px 24px 80px !important; min-height: auto !important; }
          .hero-body { margin-left: 0 !important; max-width: 100% !important; }
          .pill-btn { padding: 16px 32px !important; font-size: 13px !important; }
          .payment-card { padding: 40px 28px !important; }
          .site-nav { padding: 0 6px 0 18px !important; }
        }
        @media (max-width: 640px) {
          .tab-grid { grid-template-columns: 1fr !important; }
          .stats-grid { flex-direction: column !important; gap: 24px !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .testi-grid { grid-template-columns: 1fr !important; }
          .amen-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .section-pad { padding: 64px 20px !important; }
          .section-pad-lg { padding: 80px 20px !important; }
          .footer-pad { padding: 56px 20px 24px !important; }
          .hero-section { padding: 120px 20px 64px !important; }
          .pill-btn { padding: 14px 26px !important; font-size: 12px !important; width: 100% !important; justify-content: center !important; }
        }
      `}</style>
{/* ── NAV ─────────────────────────────────────────────── */}
     <style>{`
  @media (max-width: 768px) {
    .hide-mobile { display: none !important; }
    .show-mobile { display: block !important; }
  }
  @media (min-width: 769px) {
    .show-mobile { display: none !important; }
  }
`}</style>

<nav style={{
  position: 'fixed',
  top: 24, 
  left: '50%',
  transform: 'translateX(-50%)', 
  zIndex: 100,
  height: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 8px 0 24px', 
  // background: '#ffffff', 
  borderRadius: 999, 
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
  border: '1px solid #f0f0f0',
  width: '90%',
  maxWidth: 1000, 
  transition: 'all .35s',
}} className='bg-background site-nav'>
  
  {/* Logo Section */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
    <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', border: "1px solid #ff5a36", borderRadius: '50%'  }}>
      <Building2 size={16} color="#ff5a36" />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#111', lineHeight: 1.1 }}>LEA Executive</div>
    </div>
  </div>

  {/* Center Links (Hidden on Mobile) */}
  <div className="hide-mobile" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
    {[['How It Works', 'howitworks'], ['Features', 'features'], ['Gallery', 'gallery'], ['Payments', 'payments'], ['Contact', 'contact']].map(([l, id]) => (
      <button key={id} className="nav-btn" 
        onClick={() => id === 'contact' ? router.push('/contact') : scrollTo(id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: '#444'
        }}>
        {l}
      </button>
    ))}
  </div>

  {/* Right Action Buttons */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <button className="nav-btn hide-mobile" onClick={() => router.push('/login')} 
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: '#444',
        padding: '10px 16px'
      }}>
      Login
    </button>
    
    <button className="btn-primary hide-mobile" onClick={() => router.push('/login')} 
      style={{ 
        padding: '10px 20px', 
        fontSize: 14,
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
        background: '#ff5a36', 
        color: '#fff',
        border: 'none',
        borderRadius: 999, 
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer'
      }}>
      Sign Up <ArrowUpRight size={14} />
    </button>
    
    {/* Mobile Hamburger Trigger (Replaces LuxuryHamburgerMenu) */}
    <button 
      className="show-mobile" 
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex' }}
    >
      {isMobileMenuOpen ? <X size={24} color="#111" /> : <Menu size={24} color="#111" />}
    </button>
  </div>
</nav>
{/* Mobile Menu Overlay */}
{isMobileMenuOpen && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh', overflowY: 'auto',
    background: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white
    backdropFilter: 'blur(20px)',           // The glassmorphism effect
    WebkitBackdropFilter: 'blur(20px)',      // Safari support
    zIndex: 99,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '24px',
    padding: '24px'
  }}>
    
    {/* Close Icon (positioned absolute) */}
    <button 
      onClick={() => setIsMobileMenuOpen(false)}
      style={{ position: 'absolute', top: 42, right: 32, background: 'none', border: 'none', cursor: 'pointer' }}
    >
      <X size={32} color="#111" />
    </button>

    {/* Menu Links */}
    {[['How It Works', 'howitworks'], ['Features', 'features'], ['Gallery', 'gallery'], ['Payments', 'payments'], ['Contact', 'contact']].map(([l, id]) => (
      <button 
        key={id} 
        onClick={() => {
          setIsMobileMenuOpen(false);
          id === 'contact' ? router.push('/contact') : document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }}
        style={{
          background: 'none', border: 'none', textAlign: 'center',
          fontFamily: "'Nunito', serif", fontSize: 'clamp(24px, 7vw, 32px)', fontWeight: 600, color: '#111', cursor: 'pointer'
        }}
      >
        {l}
      </button>
    ))}

    <div style={{ marginTop: '24px', width: '100%', maxWidth: '320px' }}>
      <button 
        onClick={() => { setIsMobileMenuOpen(false); router.push('/login'); }}
        style={{
          width: '100%', padding: '18px 0', borderRadius: '999px',
          background: '#ff5a36', color: '#fff', border: 'none', 
          fontFamily: "'DM Sans', sans-serif", fontSize: '16px', fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'center'
        }}
      >
        Sign Up
      </button>
    </div>
  </div>
)}
<section style={{ 
  position: 'relative', 
  minHeight: '100vh', 
  display: 'flex', 
  flexDirection: 'column',
  justifyContent: 'center',
  backgroundColor: '#fafffa', // Linen Canvas
  overflow: 'hidden',
  padding: '120px 50px',
  fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif"
}} className="hero-section">
  
  <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
    
    {/* Decorative Accent Tick */}
    <div className="fade-up fade-up-1" style={{ 
      width: '50px', 
      height: '2px', 
      backgroundColor: '#ff5a36', // Voltage
      marginBottom: '45px' 
    }} />

    {/* Metadata / Tag */}
    <div className="fade-up fade-up-1" style={{ 
      fontSize: '11px', 
      fontWeight: 350, 
      textTransform: 'uppercase', 
      letterSpacing: '0.11px',
      color: '#516254', // Sage
      marginBottom: '30px'
    }}>
      Property Management Platform · Nairobi
    </div>

    {/* Display Headline */}
    <h1 className="fade-up fade-up-2" style={{
      fontFamily: "'Editorial New', 'Playfair Display', 'Canela', serif",
      fontSize: 'clamp(40px, 11vw, 160px)',
      fontWeight: 300, 
      lineHeight: 0.90, 
      letterSpacing: '-0.02em',
      color: '#121613', // Obsidian Ink
      margin: '0  },
  { label: "Services", sub: "What we offer", path: "services", num: "04" },
  { label: "Contact", sub: "Get in touch", path: "contact", num: "05" },
];

const IMAGES = [
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=600", // Modern living room
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600", // Luxury kitchen
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=600", // Master bedroom
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=600", // Spa bathroom
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=600", // Rooftop terrace
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600", // Fitness center
];



export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    ['How It Works', 'howitworks'], 
    ['Features', 'features'], 
    ['Gallery', 'gallery'], 
    ['Payments', 'payments'], 
    ['Contact', 'contact']
  ];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  // Dashboard features — exactly what exists in the app
  const features = [
    {
      icon: MessageSquare,
      title: 'Direct Chat with Management',
      desc: 'Tenants get a private messaging channel with the property manager. Ask questions, report issues, get updates — no phone tag, no waiting.',
      color: '#0d9488',
      num: '01',
    },
    {
      icon: Receipt,
      title: 'M-Pesa Rent Payments',
      desc: 'Pay rent directly via M-Pesa. Your payment is logged and confirmed in the system immediately. Landlord gets instant notification.',
      color: '#16a34a',
      num: '02',
    },
    {
      icon: FileText,
      title: 'Policies & Documents',
      desc: 'House rules, tenancy agreements, move-in guidelines — all stored digitally. Read them anytime, sign and download the agreement as a PDF.',
      color: '#2563eb',
      num: '03',
    },
    {
      icon: Wrench,
      title: 'Maintenance Requests',
      desc: 'Submit plumbing, electrical, structural, or cleaning requests with one tap. Track status from submitted → in progress → resolved in real time.',
      color: '#ea580c',
      num: '04',
    },
    {
      icon: ClipboardList,
      title: 'Formal Complaints',
      desc: 'Log complaints with a title, full description, and timestamp. Management reviews and updates status. Everything is on record.',
      color: '#dc2626',
      num: '05',
    },
    {
      icon: Users,
      title: 'Community Group Chat',
      desc: 'A shared group channel for all residents. Management posts announcements, tenants stay informed about building updates and events.',
      color: '#7c3aed',
      num: '06',
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      desc: 'Instant alerts for new messages, payment confirmations, status updates, and community announcements — even when the app is closed.',
      color: '#b45309',
      num: '07',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      desc: 'Your data is protected with Supabase Row Level Security. Only you and your property manager see your personal conversations and records.',
      color: '#0891b2',
      num: '08',
    },
  ]

  // What you see when you log in as a tenant
  const dashboardTabs = [
    { label: 'Chat', icon: MessageSquare, desc: 'Private messages with your landlord' },
    { label: 'Community', icon: Users, desc: 'Group chat & announcements' },
    { label: 'Complaints', icon: ClipboardList, desc: 'Submit & track issues' },
    { label: 'Requests', icon: Wrench, desc: 'Maintenance & service requests' },
    { label: 'Policies', icon: FileText, desc: 'Documents & house rules' },
    { label: 'Settings', icon: Bell, desc: 'Profile & notifications' },
  ]

  const testimonials = [
    {
      name: 'Amina W.',
      role: 'Resident Tenant',
      avatar: 'AW',
      rating: 5,
      text: 'Paying rent through the app is so seamless. I send to the Paybill and a few seconds later it shows confirmed. No more calling to check if it went through.',
    },
    {
      name: 'James M.',
      role: 'Resident Tenant',
      avatar: 'JM',
      rating: 5,
      text: 'I logged a plumbing issue on Monday morning. By Wednesday it was already resolved and marked done in the app. This is how management should work.',
    },
    {
      name: 'Faith N.',
      role: 'Resident Tenant',
      avatar: 'FN',
      rating: 5,
      text: 'The community chat is great. We know immediately when there\'s a water outage or a notice from management. Everyone stays on the same page.',
    },
  ]

  const howItWorks = [
    {
      step: '1',
      title: 'You get an account',
      desc: 'Your property manager registers you in the system. You receive a login link and set up your account in under 2 minutes.',
    },
    {
      step: '2',
      title: 'Set up your profile',
      desc: 'Add your name, photo, and phone number. Link your M-Pesa number so payments can be tracked automatically when you pay rent.',
    },
    {
      step: '3',
      title: 'Manage everything from one place',
      desc: 'Chat with management, pay rent, submit requests, read policies, and stay connected with your building community — all in one app.',
    },
  ]

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", background: '#0a0a0a', color: '#f2ede4', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #0a0a0a; }

        .nav-btn { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; background: none; border: none; cursor: pointer; color: rgba(242,237,228,.55); transition: color .2s; padding: 4px 0; }
        .nav-btn:hover { color: #f2ede4; }

        .btn-gold { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; background: #c9a96e; color: #0a0a0a; border: none; cursor: pointer; padding: 14px 32px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-gold:hover { background: #b8914f; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,169,110,.25); }

        .btn-outline { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; background: transparent; color: #f2ede4; border: 1px solid rgba(242,237,228,.28); cursor: pointer; padding: 13px 32px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-outline:hover { border-color: #c9a96e; color: #c9a96e; }

        .gold-line { width: 44px; height: 1px; background: #c9a96e; margin: 16px 0; }
        .gold-line-center { width: 44px; height: 1px; background: #c9a96e; margin: 16px auto; }
        .sec-label { font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: #c9a96e; }

        .feat-card { background: #131313; border: 1px solid rgba(242,237,228,.07); padding: 36px 32px; transition: border-color .3s, transform .4s cubic-bezier(.16,1,.3,1); }
        .feat-card:hover { border-color: rgba(201,169,110,.25); transform: translateY(-4px); }

        .tab-chip { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .06em; border: 1px solid rgba(242,237,228,.12); background: rgba(242,237,228,.04); padding: 10px 18px; display: flex; align-items: center; gap: 8px; transition: all .25s; }
        .tab-chip:hover { border-color: rgba(201,169,110,.35); background: rgba(201,169,110,.06); color: #c9a96e; }

        .testi-card { padding: 36px; border: 1px solid rgba(242,237,228,.09); transition: border-color .3s; }
        .testi-card:hover { border-color: rgba(201,169,110,.25); }

        .step-num { font-family: 'Cormorant Garamond', serif; font-size: 72px; font-weight: 300; color: rgba(201,169,110,.12); line-height: 1; position: absolute; top: -16px; left: -8px; z-index: 0; }

        .mpesa-badge { background: rgba(22,163,74,.1); border: 1px solid rgba(22,163,74,.25); color: #4ade80; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; padding: 4px 12px; display: inline-flex; align-items: center; gap: 6px; }

        .amen-item { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border: 1px solid rgba(242,237,228,.07); transition: border-color .25s; }
        .amen-item:hover { border-color: rgba(201,169,110,.2); }

        .paybill-box { background: rgba(201,169,110,.07); border: 1px solid rgba(201,169,110,.2); padding: 16px 28px; text-align: center; min-width: 140px; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp .6s ease forwards; }
        .fade-up-1 { animation-delay: .1s; opacity: 0; }
        .fade-up-2 { animation-delay: .25s; opacity: 0; }
        .fade-up-3 { animation-delay: .4s; opacity: 0; }
        .fade-up-4 { animation-delay: .55s; opacity: 0; }

        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .tab-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .testi-grid { grid-template-columns: 1fr !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .amen-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .paybill-row { flex-direction: column !important; align-items: flex-start !important; }
          .hero-ctas { flex-direction: column !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .tab-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .testi-grid { grid-template-columns: 1fr !important; }
          .amen-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
{/* ── NAV ─────────────────────────────────────────────── */}
     <style>{`
  @media (max-width: 768px) {
    .hide-mobile { display: none !important; }
    .show-mobile { display: block !important; }
  }
  @media (min-width: 769px) {
    .show-mobile { display: none !important; }
  }
`}</style>

<nav style={{
  position: 'fixed',
  top: 24, 
  left: '50%',
  transform: 'translateX(-50%)', 
  zIndex: 100,
  height: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 8px 0 24px', 
  // background: '#ffffff', 
  borderRadius: 999, 
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
  border: '1px solid #f0f0f0',
  width: '90%',
  maxWidth: 1000, 
  transition: 'all .35s',
}} className='bg-background'>
  
  {/* Logo Section */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
    <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', border: "1px solid #ff5a36", borderRadius: '50%'  }}>
      <Building2 size={16} color="#ff5a36" />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#111', lineHeight: 1.1 }}>LEA Executive</div>
    </div>
  </div>

  {/* Center Links (Hidden on Mobile) */}
  <div className="hide-mobile" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
    {[['How It Works', 'howitworks'], ['Features', 'features'], ['Gallery', 'gallery'], ['Payments', 'payments'], ['Contact', 'contact']].map(([l, id]) => (
      <button key={id} className="nav-btn" 
        onClick={() => id === 'contact' ? router.push('/contact') : scrollTo(id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: '#444'
        }}>
        {l}
      </button>
    ))}
  </div>

  {/* Right Action Buttons */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <button className="nav-btn hide-mobile" onClick={() => router.push('/login')} 
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: '#444',
        padding: '10px 16px'
      }}>
      Login
    </button>
    
    <button className="btn-primary hide-mobile" onClick={() => router.push('/login')} 
      style={{ 
        padding: '10px 20px', 
        fontSize: 14,
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
        background: '#ff5a36', 
        color: '#fff',
        border: 'none',
        borderRadius: 999, 
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer'
      }}>
      Sign Up <ArrowUpRight size={14} />
    </button>
    
    {/* Mobile Hamburger Trigger (Replaces LuxuryHamburgerMenu) */}
    <button 
      className="show-mobile" 
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex' }}
    >
      {isMobileMenuOpen ? <X size={24} color="#111" /> : <Menu size={24} color="#111" />}
    </button>
  </div>
</nav>
{/* Mobile Menu Overlay */}
{isMobileMenuOpen && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white
    backdropFilter: 'blur(20px)',           // The glassmorphism effect
    WebkitBackdropFilter: 'blur(20px)',      // Safari support
    zIndex: 99,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '32px',
    padding: '24px'
  }}>
    
    {/* Close Icon (positioned absolute) */}
    <button 
      onClick={() => setIsMobileMenuOpen(false)}
      style={{ position: 'absolute', top: 42, right: 32, background: 'none', border: 'none', cursor: 'pointer' }}
    >
      <X size={32} color="#111" />
    </button>

    {/* Menu Links */}
    {[['How It Works', 'howitworks'], ['Features', 'features'], ['Gallery', 'gallery'], ['Payments', 'payments'], ['Contact', 'contact']].map(([l, id]) => (
      <button 
        key={id} 
        onClick={() => {
          setIsMobileMenuOpen(false);
          id === 'contact' ? router.push('/contact') : document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }}
        style={{
          background: 'none', border: 'none', textAlign: 'center',
          fontFamily: "'Nunito', serif", fontSize: '32px', fontWeight: 600, color: '#111', cursor: 'pointer'
        }}
      >
        {l}
      </button>
    ))}

    <div style={{ marginTop: '24px' }}>
      <button 
        onClick={() => { setIsMobileMenuOpen(false); router.push('/login'); }}
        style={{
          padding: '16px 150px', borderRadius: '999px',
          background: '#ff5a36', color: '#fff', border: 'none', 
          fontFamily: "'DM Sans', sans-serif", fontSize: '16px', fontWeight: 500, cursor: 'pointer'
        }}
      >
        Sign Up
      </button>
    </div>
  </div>
)}
<section style={{ 
  position: 'relative', 
  minHeight: '100vh', 
  display: 'flex', 
  flexDirection: 'column',
  justifyContent: 'center',
  backgroundColor: '#fafffa', // Linen Canvas
  overflow: 'hidden',
  padding: '120px 50px',
  fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif"
}}>
  
  <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
    
    {/* Decorative Accent Tick */}
    <div className="fade-up fade-up-1" style={{ 
      width: '50px', 
      height: '2px', 
      backgroundColor: '#ff5a36', // Voltage
      marginBottom: '45px' 
    }} />

    {/* Metadata / Tag */}
    <div className="fade-up fade-up-1" style={{ 
      fontSize: '11px', 
      fontWeight: 350, 
      textTransform: 'uppercase', 
      letterSpacing: '0.11px',
      color: '#516254', // Sage
      marginBottom: '30px'
    }}>
      Property Management Platform · Nairobi
    </div>

    {/* Display Headline */}
    <h1 className="fade-up fade-up-2" style={{
      fontFamily: "'Editorial New', 'Playfair Display', 'Canela', serif",
      fontSize: 'clamp(80px, 10vw, 160px)',
      fontWeight: 300, 
      lineHeight: 0.90, 
      letterSpacing: '-0.02em',
      color: '#121613', // Obsidian Ink
      margin: '0 0 60px 0',
      position: 'relative',
      zIndex: 2,
      maxWidth: '1100px'
    }}>
      Your Home.<br />
      Managed Digitally.<br />
      From One App.
    </h1>

    {/* B&W Editorial Image (Floating/Asymmetric) */}
    <div className="hide-mobile" style={{
      position: 'absolute',
      right: '5%',
      top: '15%',
      width: '340px',
      height: '460px',
      backgroundImage: 'url(/images/licensed-image.jpg)',
      backgroundSize: 'cover', 
      backgroundPosition: 'center',
      borderRadius: '14px',
      filter: 'grayscale(100%) contrast(110%)', // Forces B&W editorial look
      zIndex: 1,
    }} />

    {/* Body & CTAs Container */}
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '40px', 
      maxWidth: '480px',
      marginLeft: '15%' // Asymmetric push
    }}>
      
      <div className="fade-up fade-up-3">
        <p style={{ 
          fontSize: '16px', 
          fontWeight: 400, 
          lineHeight: 1.4, 
          letterSpacing: '-0.32px',
          color: '#121613', // Obsidian Ink
          marginBottom: '15px' 
        }}>
          LEA Executive Residency gives every tenant a digital dashboard to pay rent via M-Pesa, chat with management, log maintenance requests, access all house policies, and stay connected with building announcements.
        </p>
        <p style={{ 
          fontSize: '14px', 
          fontWeight: 350, 
          color: '#516254' // Sage
        }}>
          No more calling. No more confusion. Everything on record.
        </p>
      </div>

      <div className="fade-up fade-up-4 hero-ctas" style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap' }}>
        
        {/* Voltage Primary CTA */}
        <button onClick={() => router.push('/login')} style={{
          padding: '20px 50px',
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          background: '#ff5a36', // Koala Orange (change to #c9a96e to keep your original gold)
          color: '#fff',
          border: 'none',
          borderRadius: 999, // Pill shape for button
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 550,
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          cursor: 'pointer',

          transition: 'transform 0.2s ease'
        }}>
          Get Started <span>→</span>
        </button>

        {/* Ghost Link Secondary */}
        <button onClick={() => router.push('/login?demo=true')} style={{
          backgroundColor: 'transparent',
          color: '#121613',
          fontSize: '14px',
          fontWeight: 350,
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: '4px'
        }}>
          Request Demo
        </button>

      </div>
    </div>

    {/* Editorial "Stats" Row replacing the bottom grid */}
    <div style={{
      display: 'flex', 
      gap: '80px', 
      marginTop: '120px',
      flexWrap: 'wrap'
    }}>
      {[
        ['6+', 'Dashboard Features'],
        ['M-Pesa', 'Instant Payments'],
        ['Real-time', 'Chat & Notifications'],
      ].map(([num, label]) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ 
            fontFamily: "'TWK Lausanne', 'Inter', sans-serif", 
            fontSize: '18px', 
            fontWeight: 400, 
            color: '#121613' 
          }}>
            {num}
          </div>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: 350, 
            letterSpacing: '0.11px', 
            textTransform: 'uppercase', 
            color: '#516254' 
          }}>
            {label}
          </div>
        </div>
      ))}
    </div>

  </div>
</section>

      {/* ── WHAT'S ON THE DASHBOARD ───────────────────────────── */}
{/* ── WHAT YOU GET ─────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#fafffa', padding: '120px 50px', fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '80px', flexWrap: 'wrap', gap: '40px' }}>
            <div>
              {/* Voltage Accent Tick */}
              <div style={{ width: '50px', height: '2px', backgroundColor: '#ff5a36', marginBottom: '45px' }} />
              
              <div style={{ fontSize: '11px', fontWeight: 350, textTransform: 'uppercase', letterSpacing: '0.11px', color: '#516254', marginBottom: '20px' }}>
                What You Get
              </div>
              
              <h2 style={{ 
                fontFamily: "'Editorial New', 'Playfair Display', 'Canela', serif", 
                fontSize: 'clamp(60px, 8vw, 96px)', 
                fontWeight: 300, 
                lineHeight: 0.90, 
                letterSpacing: '-0.02em', 
                color: '#121613', 
                margin: 0 
              }}>
                Your Dashboard Has<br />6 Sections.
              </h2>
            </div>

            <p style={{ fontSize: '16px', fontWeight: 400, color: '#121613', maxWidth: '340px', lineHeight: 1.4, margin: 0, paddingBottom: '10px' }}>
              When you log in, this is your navigation. Every section is built specifically for tenants and property managers.
            </p>
          </div>

          {/* Tab Grid - Borderless, defined by typography and spacing */}
          <div className="tab-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px 40px' }}>
            {dashboardTabs.map(({ label, icon: Icon, desc }) => (
              <div key={label} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                {/* Minimalist icon container */}
                <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={24} color="#121613" strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 400, color: '#121613', marginBottom: '8px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 350, color: '#516254', lineHeight: 1.4, maxWidth: '280px' }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section id="howitworks" style={{ backgroundColor: '#fafffa', padding: '120px 50px', fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          {/* Asymmetric Left-Aligned Header */}
          <div style={{ marginBottom: '100px' }}>
            {/* Voltage Accent Tick */}
            <div style={{ width: '50px', height: '2px', backgroundColor: '#ff5a36', marginBottom: '45px' }} />
            
            <div style={{ fontSize: '11px', fontWeight: 350, textTransform: 'uppercase', letterSpacing: '0.11px', color: '#516254', marginBottom: '20px' }}>
              Getting Started
            </div>
            
            <h2 style={{ 
              fontFamily: "'Editorial New', 'Playfair Display', 'Canela', serif", 
              fontSize: 'clamp(80px, 10vw, 140px)', 
              fontWeight: 300, 
              lineHeight: 0.90, 
              letterSpacing: '-0.02em', 
              color: '#121613', 
              margin: 0 
            }}>
              How It Works.
            </h2>
          </div>

          {/* Steps Grid - Editorial layout dropping the heavy borders */}
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '80px 40px' }}>
            {howItWorks.map(({ step, title, desc }) => (
              <div key={step} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                
                {/* Secondary Display Voice for Numbers */}
                <div style={{ 
                  fontFamily: "'PP Mondwest', 'GT Sectra', serif", 
                  fontSize: '96px', 
                  fontWeight: 400, 
                  lineHeight: 0.90, 
                  color: '#c8d2c8', // Mist
                  marginBottom: '30px', 
                  letterSpacing: '-0.04em' 
                }}>
                  0{step}
                </div>
                
                <h3 style={{ fontSize: '18px', fontWeight: 400, color: '#121613', marginBottom: '15px' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '16px', fontWeight: 350, color: '#516254', lineHeight: 1.4, maxWidth: '90%' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* CTA Area */}
          <div style={{ marginTop: '120px', display: 'flex', justifyContent: 'flex-start' }}>
            <button onClick={() => router.push('/login')} style={{
              padding: '20px 50px',
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          background: '#ff5a36', // Koala Orange (change to #c9a96e to keep your original gold)
          color: '#fff',
          border: 'none',
          borderRadius: 999, // Pill shape for button
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 550,
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          cursor: 'pointer',

          transition: 'transform 0.2s ease'
            }}>
              Get Access <span>→</span>
            </button>
          </div>

        </div>
      </section>

     {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" style={{ backgroundColor: '#fafffa', padding: '120px 50px', fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '80px', flexWrap: 'wrap', gap: '40px' }}>
            <div>
              {/* Voltage Accent Tick */}
              <div style={{ width: '50px', height: '2px', backgroundColor: '#ff5a36', marginBottom: '45px' }} />
              
              <div style={{ fontSize: '11px', fontWeight: 350, textTransform: 'uppercase', letterSpacing: '0.11px', color: '#516254', marginBottom: '20px' }}>
                Platform Features
              </div>
              
              <h2 style={{ 
                fontFamily: "'Editorial New', 'Playfair Display', 'Canela', serif", 
                fontSize: 'clamp(60px, 8vw, 96px)', 
                fontWeight: 300, 
                lineHeight: 0.90, 
                letterSpacing: '-0.02em', 
                color: '#121613', 
                margin: 0 
              }}>
                Everything a Tenant<br />Could Need.
              </h2>
            </div>
            
            <p style={{ fontSize: '16px', fontWeight: 400, color: '#516254', maxWidth: '340px', lineHeight: 1.4, margin: 0, paddingBottom: '10px' }}>
              All features are live and functional at lea-residency.vercel.app. Log in to access your dashboard.
            </p>
          </div>

          <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '40px' }}>
            {features.map(({ icon: Icon, title, desc, num }) => (
              <div 
                key={num} 
                className="feat-card bg-background" 
                style={{ 
                  display: 'flex', 
                  gap: '24px', 
                  alignItems: 'flex-start',
                  backgroundColor: '#FffffA', // Linen Canvas
                  padding: '48px 40px',
                  borderRadius: '24px',
                  boxShadow: '0 24px 48px rgba(18, 22, 19, 0.04)',
                  border: '1px solid rgba(18, 22, 19, 0.03)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 32px 64px rgba(18, 22, 19, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 24px 48px rgba(18, 22, 19, 0.04)';
                }}
              >
                <div style={{ width: '48px', height: '48px', backgroundColor: '#fafffa', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #eef2ef' }}>
                  <Icon size={24} color="#121613" strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px', marginBottom: '16px' }}>
                    <h3 style={{ fontFamily: "'Editorial New', 'Playfair Display', serif", fontSize: '28px', fontWeight: 400, color: '#121613', lineHeight: 1.1, margin: 0 }}>
                      {title}
                    </h3>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#c8d2c8', letterSpacing: '0.05em' }}>{num}</span>
                  </div>
                  <p style={{ fontSize: '15px', fontWeight: 350, color: '#516254', lineHeight: 1.6, margin: 0, maxWidth: '95%' }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAYMENTS SECTION ─────────────────────────────────── */}
      <section id="payments" style={{ backgroundColor: '#fafffa', padding: '120px 50px', fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '100px', alignItems: 'center' }}>
            
            {/* Left — content */}
            <div>
              {/* Voltage Accent Tick */}
              <div style={{ width: '50px', height: '2px', backgroundColor: '#ff5a36', marginBottom: '45px' }} />
              
              <div style={{ fontSize: '11px', fontWeight: 350, textTransform: 'uppercase', letterSpacing: '0.11px', color: '#516254', marginBottom: '20px' }}>
                Rent Payments
              </div>
              
              <h2 style={{ 
                fontFamily: "'Editorial New', 'Playfair Display', 'Canela', serif", 
                fontSize: 'clamp(50px, 6vw, 80px)', 
                fontWeight: 300, 
                lineHeight: 0.90, 
                letterSpacing: '-0.02em', 
                color: '#121613', 
                margin: '0 0 30px 0' 
              }}>
                Pay Rent Via<br />M-Pesa.<br />
                <span style={{ fontSize: '50%', color: '#c8d2c8', display: 'block', marginTop: '15px' }}>Logged Automatically</span>
              </h2>
              
              <p style={{ fontSize: '16px', fontWeight: 400, color: '#516254', lineHeight: 1.5, marginBottom: '40px', maxWidth: '480px' }}>
                Use M-Pesa Paybill to pay rent. Your payment is recognised by the system automatically, logged against your account, and your landlord is notified instantly. No manual confirmation needed.
              </p>

              {/* Payment flow */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Tenant initiates payment from their M-Pesa menu',
                  'Payment goes through as usual via M-Pesa',
                  'Our system detects the payment in real time via M-Pesa APIs',
                  'Payment received and logged in real time',
                  'Tenant gets immediate confirmation in-app',
                  'Landlord receives instant notification',
                  'Monthly history and receipts saved forever'
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '6px', height: '6px', backgroundColor: '#ff5a36', borderRadius: '50%' }} />
                    <span style={{ fontSize: '14px', color: '#121613', fontWeight: 400 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — visual */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #eef2ef', padding: '60px 50px', boxShadow: '0 30px 60px rgba(18, 22, 19, 0.03)' }}>
              
              <div style={{ marginBottom: '40px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.11px', textTransform: 'uppercase', color: '#516254', marginBottom: '16px' }}>
                  April 2026 · Rent Status
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontFamily: "'Editorial New', serif", fontSize: '48px', lineHeight: 0.8, color: '#ff5a36' }}>PAID</span>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#121613' }}>KES 22,000</span>
                </div>
                <div style={{ height: '4px', backgroundColor: '#eef2ef', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', backgroundColor: '#ff5a36' }} />
                </div>
              </div>

              {/* Payment history rows */}
              {[
                { month: 'March 2026', amount: 'KES 22,000', code: 'RGR0012345', status: 'PAID' },
                { month: 'February 2026', amount: 'KES 22,000', code: 'RGR0098231', status: 'PAID' },
                { month: 'January 2026', amount: 'KES 22,000', code: 'RGR0076654', status: 'PAID' },
              ].map((p, idx) => (
                <div key={p.month} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: idx === 0 ? '1px solid #121613' : '1px solid #eef2ef' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#121613', fontWeight: 500 }}>{p.month}</div>
                    <div style={{ fontSize: '12px', color: '#516254', marginTop: '4px' }}>{p.code}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', color: '#121613', fontWeight: 500 }}>{p.amount}</div>
                    <div style={{ fontSize: '10px', color: '#ff5a36', letterSpacing: '0.05em', fontWeight: 600, marginTop: '4px' }}>{p.status}</div>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '40px', padding: '20px', backgroundColor: 'rgba(43, 238, 75, 0.05)', borderLeft: '2px solid #ff5a36' }}>
                <p style={{ fontSize: '13px', color: '#121613', lineHeight: 1.5, margin: 0 }}>
                  <strong>Note:</strong> The app also supports STK Push — tap to trigger an M-Pesa prompt directly to your phone without opening the M-Pesa menu.
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* ── BUILDING AMENITIES ───────────────────────────────── */}
      <section style={{ backgroundColor: '#fafffa', padding: '120px 50px', fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ marginBottom: '80px' }}>
            <div style={{ width: '50px', height: '2px', backgroundColor: '#ff5a36', marginBottom: '45px' }} />
            <div style={{ fontSize: '11px', fontWeight: 350, textTransform: 'uppercase', letterSpacing: '0.11px', color: '#516254', marginBottom: '20px' }}>
              What's Included
            </div>
            <h2 style={{ 
              fontFamily: "'Editorial New', 'Playfair Display', 'Canela', serif", 
              fontSize: 'clamp(50px, 6vw, 80px)', 
              fontWeight: 300, 
              lineHeight: 0.90, 
              letterSpacing: '-0.02em', 
              color: '#121613', 
              margin: 0 
            }}>
              Building Facilities.
            </h2>
          </div>

          <div className="amen-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px 40px' }}>
            {[
              { icon: Wifi, label: 'High-Speed WiFi', desc: 'Fibre connection in all units' },
              { icon: Car, label: 'Secure Parking', desc: 'Controlled access parking bay' },
              { icon: Zap, label: 'Backup Power', desc: 'Generator for power outages' },
              { icon: Shield, label: 'CCTV Security', desc: '24/7 surveillance, controlled gate' },
              { icon: Wifi, label: 'Water Supply', desc: 'Consistent water, storage tanks' },
              { icon: CheckCircle, label: 'Digital Management', desc: 'Everything handled through the app' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={24} color="#121613" strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: '#121613', marginBottom: '8px' }}>{label}</div>
                  <div style={{ fontSize: '14px', color: '#516254', lineHeight: 1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section style={{ backgroundColor: '#fafffa', padding: '120px 50px', fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ marginBottom: '100px' }}>
            <div style={{ width: '50px', height: '2px', backgroundColor: '#ff5a36', marginBottom: '45px' }} />
            <div style={{ fontSize: '11px', fontWeight: 350, textTransform: 'uppercase', letterSpacing: '0.11px', color: '#516254', marginBottom: '20px' }}>
              From Our Residents
            </div>
            <h2 style={{ 
              fontFamily: "'Editorial New', 'Playfair Display', 'Canela', serif", 
              fontSize: 'clamp(60px, 8vw, 96px)', 
              fontWeight: 300, 
              lineHeight: 0.90, 
              letterSpacing: '-0.02em', 
              color: '#121613', 
              margin: 0 
            }}>
              What Tenants<br />Are Saying.
            </h2>
          </div>

          <div className="testi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '60px' }}>
            {testimonials.map((t, idx) => (
              <div key={t.name} style={{ display: 'flex', flexDirection: 'column' }}>
                <p style={{ 
                  fontFamily: "'Editorial New', 'Playfair Display', serif", 
                  fontSize: '24px', 
                  fontWeight: 400, 
                  lineHeight: 1.3, 
                  color: '#121613', 
                  marginBottom: '30px', 
                  fontStyle: 'italic' 
                }}>
                  "{t.text}"
                </p>
                
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '48px', height: '48px', 
                    backgroundColor: '#eef2ef', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '14px', fontWeight: 500, color: '#121613' 
                  }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#121613' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: '#516254', marginTop: '2px' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#fafffa', padding: '150px 50px', borderTop: '1px solid #eef2ef', borderBottom: '1px solid #eef2ef', fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div style={{ width: '2px', height: '50px', backgroundColor: '#ff5a36', marginBottom: '45px' }} />
          
          <div style={{ fontSize: '11px', fontWeight: 350, textTransform: 'uppercase', letterSpacing: '0.11px', color: '#516254', marginBottom: '20px' }}>
            Ready to Get Started
          </div>
          
          <h2 style={{ 
            fontFamily: "'Editorial New', 'Playfair Display', 'Canela', serif", 
            fontSize: 'clamp(50px, 6vw, 80px)', 
            fontWeight: 300, 
            lineHeight: 0.90, 
            letterSpacing: '-0.02em', 
            color: '#121613', 
            marginBottom: '30px'
          }}>
            Your Dashboard Awaits.
          </h2>
          
          <p style={{ fontSize: '16px', color: '#516254', marginBottom: '50px', lineHeight: 1.5, maxWidth: '500px' }}>
            If you are a resident at LEA Executive Residency, log in to access your full tenant dashboard. New residents are registered by management.
          </p>
          
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/login')} style={{
              padding: '20px 50px',
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
           // Koala Orange (change to #c9a96e to keep your original gold)
          color: '#ff5a36',
          border: '1px solid #ff5a36',
          borderRadius: 999, // Pill shape for button
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 550,
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          cursor: 'pointer',

          transition: 'transform 0.2s ease'
            }}>
              Tenant Login <span>→</span>
            </button>
            <button onClick={() => router.push('/contact')} style={{
              padding: '20px 50px',
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          background: '#ff5a36', // Koala Orange (change to #c9a96e to keep your original gold)
          color: '#fff',
          border: 'none',
          borderRadius: 999, // Pill shape for button
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 550,
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          cursor: 'pointer',

          transition: 'transform 0.2s ease'
            }}>
              Contact Management
            </button>
          </div>
        </div>
      </section>

      {/* ── GALLERY ─────────────────────────────────────────── */}
      <section id="gallery" style={{ backgroundColor: '#fafffa', padding: '120px 50px', fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ marginBottom: '100px' }}>
            <div style={{ width: '50px', height: '2px', backgroundColor: '#ff5a36', marginBottom: '45px' }} />
            <div style={{ fontSize: '11px', fontWeight: 350, textTransform: 'uppercase', letterSpacing: '0.11px', color: '#516254', marginBottom: '20px' }}>
              Property Gallery
            </div>
            <h2 style={{ 
              fontFamily: "'Editorial New', 'Playfair Display', 'Canela', serif", 
              fontSize: 'clamp(60px, 8vw, 96px)', 
              fontWeight: 300, 
              lineHeight: 0.90, 
              letterSpacing: '-0.02em', 
              color: '#121613', 
              marginBottom: '30px'
            }}>
              Virtual Tours.
            </h2>
            <p style={{ fontSize: '16px', color: '#516254', lineHeight: 1.5, maxWidth: '600px', margin: 0 }}>
              Take a virtual tour through our luxury residences. Experience the modern living spaces, premium amenities, and elegant design that make LEA Executive the perfect place to call home.
            </p>
          </div>

          <div className="gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '40px' }}>
            {[
              { img: IMAGES[0], title: 'Modern Living Room', desc: 'Spacious living area with premium furnishings and city views' },
              { img: IMAGES[1], title: 'Executive Kitchen', desc: 'State-of-the-art kitchen with high-end appliances' },
              { img: IMAGES[2], title: 'Master Bedroom', desc: 'Elegant master suite with premium bedding and ample storage' },
              { img: IMAGES[3], title: 'Spa Bathroom', desc: 'Luxurious bathroom with marble finishes and modern fixtures' },
              { img: IMAGES[4], title: 'Rooftop Terrace', desc: 'Private rooftop with panoramic views and outdoor seating' },
              { img: IMAGES[5], title: 'Fitness Center', desc: 'Fully equipped gym facilities for resident wellness' }
            ].map((item, i) => (
              <div key={i} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '16px' }}
                onClick={() => {
                  const modal = document.createElement('div');
                  modal.style.position = 'fixed';
                  modal.style.inset = '0';
                  modal.style.background = 'rgba(18,22,19,0.95)';
                  modal.style.zIndex = '10000';
                  modal.style.display = 'flex';
                  modal.style.alignItems = 'center';
                  modal.style.justifyContent = 'center';
                  modal.innerHTML = `
                    <div style="position: relative; max-width: 90vw; max-height: 90vh;">
                      <img src="${item.img}" style="max-width: 100%; max-height: 100%;" />
                      <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: -50px; right: 0; background: none; border: none; color: #fafffa; font-size: 32px; cursor: pointer; font-weight: 300;">×</button>
                      <div style="margin-top: 16px; text-align: left;">
                        <h3 style="color: #fafffa; font-family: 'Editorial New', serif; font-size: 24px; font-weight: 300; margin: 0 0 8px 0;">${item.title}</h3>
                        <p style="color: #c8d2c8; font-family: 'TWK Lausanne', sans-serif; font-size: 14px; margin: 0;">${item.desc}</p>
                      </div>
                    </div>
                  `;
                  document.body.appendChild(modal);
                  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
                }}>
                
                <div style={{ height: '300px', overflow: 'hidden' }}>
                  <img src={item.img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 500, color: '#121613', margin: '0 0 4px 0' }}>{item.title}</h3>
                  <p style={{ fontSize: '14px', color: '#516254', margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '80px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button onClick={() => router.push('/viewing')} style={{
               padding: '20px 50px',
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
           // Koala Orange (change to #c9a96e to keep your original gold)
          color: '#ff5a36',
          border: '1px solid #ff5a36',
          borderRadius: 999, // Pill shape for button
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 550,
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          cursor: 'pointer',

          transition: 'transform 0.2s ease'
            }}>
              Schedule a Viewing <span>→</span>
            </button>
            <button onClick={() => router.push('/gallery')} style={{
             padding: '20px 50px',
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          background: '#ff5a36', // Koala Orange (change to #c9a96e to keep your original gold)
          color: '#fff',
          border: 'none',
          borderRadius: 999, // Pill shape for button
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 550,
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          cursor: 'pointer',

          transition: 'transform 0.2s ease'
            }}>
              View More
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer id="contact" style={{ backgroundColor: '#fafffa', borderTop: '1px solid #121613', padding: '100px 50px 40px', fontFamily: "'TWK Lausanne', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '80px', marginBottom: '100px' }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', border: "1px solid #ff5a36", borderRadius: '50%' }}>
                  <Building2 size={20} color="#ff5a36" strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Editorial New', 'Playfair Display', serif", fontSize: '24px', fontWeight: 400, color: '#121613', lineHeight: 1 }}>
                    LEA Executive
                  </div>
                  <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#516254', marginTop: '6px' }}>
                    Residency
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: '#516254', lineHeight: 1.5, maxWidth: '320px', marginBottom: '30px' }}>
                A digital-first residential property in Nairobi. Tenants manage their entire tenancy — rent, requests, communication and documents — from one platform.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { icon: <Phone size={14} />, text: '+254 748 333 763' },
                  { icon: <Mail size={14} />, text: 'management@lea-residency.app' },
                  { icon: <MapPin size={14} />, text: 'Nairobi, Kenya' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#121613' }}>
                    <span style={{ color: '#ff5a36' }}>{icon}</span> {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Columns */}
            {[
              { title: 'Platform', links: ['Tenant Dashboard', 'M-Pesa Payments', 'Maintenance', 'Community Chat'] },
              { title: 'Support', links: ['How It Works', 'Contact Management', 'Policy Docs', 'Sign In'] },
              { title: 'Payments', links: ['STK Push', 'Payment History'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: '11px', letterSpacing: '0.11px', textTransform: 'uppercase', color: '#516254', marginBottom: '24px' }}>
                  {col.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {col.links.map(link => (
                    <button key={link} style={{ 
                      background: 'none', border: 'none', padding: 0, textAlign: 'left', 
                      fontSize: '14px', color: '#121613', cursor: 'pointer', transition: 'color 0.2s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.color = '#516254'}
                    onMouseOut={e => e.currentTarget.style.color = '#121613'}
                    onClick={() => router.push('/login')}>
                      {link}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #eef2ef', paddingTop: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <span style={{ fontSize: '12px', color: '#516254' }}>
              &copy; {new Date().getFullYear()} LEA Executive Residency. All rights reserved.
            </span>
            <div style={{ display: 'flex', gap: '30px' }}>
              {['Privacy Policy', 'Terms of Service', 'Tenant Rights'].map(l => (
                <span key={l} style={{ fontSize: '12px', color: '#516254', cursor: 'pointer' }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
      <InstallPrompt/>
    </div>
  )
}
