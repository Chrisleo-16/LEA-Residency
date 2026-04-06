'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, MapPin, Phone, Mail, Star, Heart,
  Search, Calendar, Users, ArrowRight, ArrowUpRight,
  Menu, X, ChevronRight, Wifi, Car, Droplets,
  Zap, Dumbbell, Coffee, Shield, CheckCircle2
} from 'lucide-react'

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [likedProps, setLikedProps] = useState<number[]>([])
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleLike = (id: number) =>
    setLikedProps(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const properties = [
    {
      id: 1, title: 'Oceanview Penthouse', location: 'Nyali, Mombasa', type: 'Penthouse',
      price: 450, rating: 4.98, reviews: 124, beds: 3, baths: 2, sqft: 2400,
      tag: 'Top Rated',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070',
    },
    {
      id: 2, title: 'Serene Garden Villa', location: 'Karen, Nairobi', type: 'Villa',
      price: 380, rating: 4.95, reviews: 89, beds: 4, baths: 3, sqft: 3200,
      tag: 'Popular',
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075',
    },
    {
      id: 3, title: 'Urban Loft Suite', location: 'Westlands, Nairobi', type: 'Apartment',
      price: 290, rating: 4.92, reviews: 210, beds: 2, baths: 2, sqft: 1100,
      tag: 'New',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2080',
    },
    {
      id: 4, title: 'Beachfront Resort Villa', location: 'Diani Beach', type: 'Villa',
      price: 650, rating: 4.99, reviews: 56, beds: 5, baths: 4, sqft: 4800,
      tag: 'Exclusive',
      image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=2070',
    },
    {
      id: 5, title: 'Executive High-Rise', location: 'Upper Hill, Nairobi', type: 'Apartment',
      price: 520, rating: 4.96, reviews: 78, beds: 3, baths: 3, sqft: 1800,
      tag: 'Premium',
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2072',
    },
    {
      id: 6, title: 'Lakeside Retreat', location: 'Naivasha', type: 'Cottage',
      price: 210, rating: 4.89, reviews: 143, beds: 2, baths: 1, sqft: 900,
      tag: 'Cozy',
      image: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?q=80&w=2070',
    },
  ]

  const filters = ['All', 'Villa', 'Penthouse', 'Apartment', 'Cottage']
  const filtered = activeFilter === 'All' ? properties : properties.filter(p => p.type === activeFilter)

  const amenities = [
    { icon: Wifi, label: 'High-Speed WiFi' },
    { icon: Car, label: 'Free Parking' },
    { icon: Droplets, label: 'Infinity Pool' },
    { icon: Zap, label: 'Backup Power' },
    { icon: Dumbbell, label: 'Private Gym' },
    { icon: Coffee, label: 'Concierge' },
    { icon: Shield, label: 'Security' },
    { icon: CheckCircle2, label: 'Verified' },
  ]

  const testimonials = [
    {
      name: 'Sarah Johnson', role: 'Frequent Traveller', location: 'New York, USA', avatar: 'SJ', rating: 5,
      text: 'The attention to detail and seamless booking process made our Diani stay absolutely unforgettable. Exceeded every expectation.',
    },
    {
      name: 'Michael Chen', role: 'Business Executive', location: 'Singapore', avatar: 'MC', rating: 5,
      text: 'LEA Executive transformed how I find corporate housing. The verified listings and instant support are genuine game-changers.',
    },
    {
      name: 'Grace Kimani', role: 'Property Host', location: 'Nairobi, Kenya', avatar: 'GK', rating: 5,
      text: 'Listing on LEA Executive brought quality guests and completely hassle-free management. Best decision I ever made.',
    },
  ]

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif", background: '#0f0f0f', color: '#f5f0e8', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #0f0f0f; }

        .nav-link { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 400; letter-spacing: .08em; color: rgba(245,240,232,.65); text-transform: uppercase; background: none; border: none; cursor: pointer; transition: color .25s; padding: 4px 0; }
        .nav-link:hover { color: #f5f0e8; }

        .btn-primary { font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; background: #c9a96e; color: #0f0f0f; border: none; cursor: pointer; padding: 14px 32px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-primary:hover { background: #b8914f; transform: translateY(-1px); }

        .btn-outline { font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; background: transparent; color: #f5f0e8; border: 1px solid rgba(245,240,232,.35); cursor: pointer; padding: 13px 32px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-outline:hover { border-color: #c9a96e; color: #c9a96e; }

        .prop-card { background: #161616; overflow: hidden; transition: transform .4s cubic-bezier(.16,1,.3,1); cursor: pointer; }
        .prop-card:hover { transform: translateY(-6px); }
        .prop-card:hover .prop-img { transform: scale(1.06); }
        .prop-img { width: 100%; height: 260px; object-fit: cover; transition: transform .7s cubic-bezier(.16,1,.3,1); display: block; }

        .filter-btn { font-family: 'DM Sans', sans-serif; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; background: transparent; border: 1px solid rgba(245,240,232,.2); color: rgba(245,240,232,.55); padding: 8px 22px; cursor: pointer; transition: all .25s; }
        .filter-btn.active, .filter-btn:hover { border-color: #c9a96e; color: #c9a96e; }

        .search-input { font-family: 'DM Sans', sans-serif; font-size: 14px; background: transparent; border: none; outline: none; width: 100%; color: #0f0f0f; }
        .search-input::placeholder { color: rgba(15,15,15,.45); }

        .gold-line { width: 48px; height: 1px; background: #c9a96e; margin: 20px 0; }
        .section-label { font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #c9a96e; }

        .amen-item { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 24px 16px; border: 1px solid rgba(245,240,232,.08); transition: border-color .25s; }
        .amen-item:hover { border-color: rgba(201,169,110,.35); }

        .testi-card { padding: 36px; border: 1px solid rgba(245,240,232,.1); transition: border-color .3s; }
        .testi-card:hover { border-color: rgba(201,169,110,.3); }

        .tag-badge { font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; background: #c9a96e; color: #0f0f0f; padding: 4px 10px; font-weight: 500; }

        .heart-btn { width: 36px; height: 36px; background: rgba(15,15,15,.7); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s; backdrop-filter: blur(4px); }
        .heart-btn:hover { background: rgba(15,15,15,.9); }

        .stat-num { font-size: clamp(36px, 5vw, 64px); font-weight: 300; line-height: 1; color: #c9a96e; }

        @media (max-width: 768px) {
          .hero-title { font-size: clamp(40px, 11vw, 80px) !important; }
          .hide-mobile { display: none !important; }
          .search-bar-inner { flex-direction: column !important; }
          .search-divider { width: 100% !important; height: 1px !important; }
          .prop-grid { grid-template-columns: 1fr !important; }
          .amen-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .testi-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ── NAV ───────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 40px',
        background: scrolled ? 'rgba(15,15,15,.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(245,240,232,.08)' : 'none',
        transition: 'all .4s',
        height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ width: 36, height: 36, border: '1px solid #c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={16} color="#c9a96e" />
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 500, letterSpacing: '.06em', color: '#f5f0e8', lineHeight: 1.1 }}>LEA Executive</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,.8)', lineHeight: 1 }}>Luxury Residences</div>
          </div>
        </div>

        {/* Desktop links */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {['Properties', 'Experiences', 'Services', 'Contact'].map(l => (
            <button key={l} className="nav-link" onClick={() => {
              const el = document.getElementById(l.toLowerCase())
              el?.scrollIntoView({ behavior: 'smooth' })
            }}>{l}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="nav-link hide-mobile" onClick={() => router.push('/login')}>Sign In</button>
          <button className="btn-primary hide-mobile" onClick={() => router.push('/login')} style={{ padding: '10px 22px', fontSize: 11 }}>
            List Property <ArrowUpRight size={12} />
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f5f0e8', display: 'none' }} className="show-mobile">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: '#0f0f0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          {['Properties', 'Experiences', 'Services', 'Contact'].map(l => (
            <button key={l} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: '#f5f0e8', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => { document.getElementById(l.toLowerCase())?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }}>{l}</button>
          ))}
          <button className="btn-primary" onClick={() => { router.push('/login'); setMenuOpen(false) }}>Sign In</button>
        </div>
      )}

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{ position: 'relative', height: '100vh', minHeight: 700, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=2070)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          transform: 'scale(1.04)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,15,15,.85) 0%, rgba(15,15,15,.45) 60%, rgba(15,15,15,.2) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,15,15,.9) 0%, transparent 50%)' }} />

        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 40px 80px', maxWidth: 800 }}>
          <div className="section-label" style={{ marginBottom: 24 }}>Kenya's Premier Collection</div>

          <h1 className="hero-title" style={{ fontSize: 'clamp(52px, 8vw, 96px)', fontWeight: 300, lineHeight: 1.02, letterSpacing: '-.01em', color: '#f5f0e8', marginBottom: 28 }}>
            Find Your<br />
            <em style={{ color: '#c9a96e', fontStyle: 'italic' }}>Perfect Stay</em><br />
            in Africa
          </h1>

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 300, color: 'rgba(245,240,232,.7)', lineHeight: 1.7, maxWidth: 460, marginBottom: 44 }}>
            Hand-curated villas, penthouses, and premium apartments across Kenya's most coveted addresses.
          </p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })}>
              Browse Properties <ArrowRight size={14} />
            </button>
            <button className="btn-outline" onClick={() => router.push('/login')}>
              List Your Property
            </button>
          </div>
        </div>

        {/* Hero stats strip */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          borderTop: '1px solid rgba(245,240,232,.12)',
          background: 'rgba(15,15,15,.6)', backdropFilter: 'blur(16px)',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        }}>
          {[['200+', 'Verified Properties'], ['50K+', 'Happy Guests'], ['4.97', 'Average Rating']].map(([num, label]) => (
            <div key={label} style={{ padding: '22px 32px', borderRight: '1px solid rgba(245,240,232,.08)', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 400, color: '#c9a96e', lineHeight: 1 }}>{num}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,.5)', marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SEARCH BAR ────────────────────────────────────────── */}
      <section style={{ background: '#161616', padding: '0 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', transform: 'translateY(-28px)' }}>
          <div style={{
            background: '#f5f0e8', display: 'flex', alignItems: 'stretch',
            boxShadow: '0 24px 80px rgba(0,0,0,.5)',
          }} className="search-bar-inner">
            {[
              { icon: <MapPin size={16} color="#c9a96e" />, label: 'Location', placeholder: 'Nairobi, Mombasa, Diani...' },
              { icon: <Calendar size={16} color="#c9a96e" />, label: 'Check-in / Check-out', placeholder: 'Select dates' },
              { icon: <Users size={16} color="#c9a96e" />, label: 'Guests', placeholder: '2 guests' },
            ].map((field, i) => (
              <div key={i} style={{ flex: 1, padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 14, borderRight: i < 2 ? '1px solid rgba(15,15,15,.1)' : 'none' }} className="search-divider">
                {field.icon}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(15,15,15,.45)', marginBottom: 4 }}>{field.label}</div>
                  <input className="search-input" placeholder={field.placeholder} />
                </div>
              </div>
            ))}
            <button className="btn-primary" style={{ margin: 0, padding: '0 36px', borderRadius: 0, flexShrink: 0 }}
              onClick={() => document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })}>
              <Search size={16} />
              <span className="hide-mobile">Search</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── PROPERTIES ────────────────────────────────────────── */}
      <section id="properties" style={{ background: '#0f0f0f', padding: '80px 40px 100px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 56, flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div className="section-label">Curated Collection</div>
              <div className="gold-line" />
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-.01em' }}>
                Featured<br /><em style={{ color: '#c9a96e' }}>Properties</em>
              </h2>
            </div>
            <button className="btn-outline" onClick={() => router.push('/login')}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 48 }}>
            {filters.map(f => (
              <button key={f} className={`filter-btn ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>
            ))}
          </div>

          {/* Grid */}
          <div className="prop-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {filtered.map((p, idx) => (
              <div key={p.id} className="prop-card" style={{ gridColumn: idx === 0 ? 'span 1' : 'span 1' }}>
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  <img src={p.image} alt={p.title} className="prop-img" style={{ height: idx === 0 ? 320 : 260 }} />
                  <div style={{ position: 'absolute', top: 16, left: 16 }}>
                    <span className="tag-badge">{p.tag}</span>
                  </div>
                  <button className="heart-btn" style={{ position: 'absolute', top: 16, right: 16 }} onClick={(e) => { e.stopPropagation(); toggleLike(p.id) }}>
                    <Heart size={15} color={likedProps.includes(p.id) ? '#ef4444' : '#f5f0e8'} fill={likedProps.includes(p.id) ? '#ef4444' : 'none'} />
                  </button>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,15,15,.8) 0%, transparent 55%)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 16px' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 400, color: '#f5f0e8', lineHeight: 1.2, marginBottom: 6 }}>{p.title}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(245,240,232,.6)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} /> {p.location}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(245,240,232,.06)' }}>
                  <div>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, color: '#c9a96e' }}>${p.price}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(245,240,232,.4)', marginLeft: 4 }}>/ night</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(245,240,232,.5)', display: 'flex', gap: 12 }}>
                      <span>{p.beds} bd</span>
                      <span>{p.baths} ba</span>
                      <span>{p.sqft.toLocaleString()} ft²</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(201,169,110,.12)', padding: '4px 10px' }}>
                      <Star size={11} fill="#c9a96e" color="#c9a96e" />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#c9a96e', fontWeight: 500 }}>{p.rating}</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0 20px 18px' }}>
                  <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => router.push('/login')}>
                    Book Now <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPERIENCES / FEATURES ─────────────────────────────── */}
      <section id="experiences" style={{ background: '#161616', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div className="section-label">The LEA Standard</div>
            <div className="gold-line" />
            <h2 style={{ fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 300, lineHeight: 1.15, marginBottom: 24 }}>
              Every Stay is a<br /><em style={{ color: '#c9a96e' }}>Curated Experience</em>
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300, color: 'rgba(245,240,232,.65)', lineHeight: 1.8, marginBottom: 40 }}>
              We don't just list properties — we orchestrate exceptional stays. Every detail, from arrival to departure, is considered and crafted.
            </p>
            {[
              'Personal concierge for every booking',
              'Verified photos and virtual tours',
              'M-Pesa and card payments accepted',
              'Instant landlord messaging',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 1, height: 20, background: '#c9a96e', flexShrink: 0 }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(245,240,232,.8)' }}>{item}</span>
              </div>
            ))}
            <button className="btn-primary" style={{ marginTop: 40 }} onClick={() => router.push('/login')}>
              Explore Services <ArrowRight size={14} />
            </button>
          </div>

          {/* Image collage */}
          <div style={{ position: 'relative', height: 520 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '65%', height: '72%', overflow: 'hidden' }}>
              <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '55%', height: '60%', overflow: 'hidden' }}>
              <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ position: 'absolute', bottom: '8%', left: '5%', background: '#0f0f0f', padding: '20px 24px', border: '1px solid rgba(201,169,110,.25)' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 400, color: '#c9a96e' }}>4.97</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,.5)', marginTop: 4 }}>Avg. Guest Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AMENITIES ─────────────────────────────────────────── */}
      <section id="services" style={{ background: '#0f0f0f', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="section-label">What's Included</div>
            <div className="gold-line" style={{ margin: '20px auto' }} />
            <h2 style={{ fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 300 }}>
              Premium <em style={{ color: '#c9a96e' }}>Amenities</em>
            </h2>
          </div>
          <div className="amen-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
            {amenities.map(({ icon: Icon, label }) => (
              <div key={label} className="amen-item">
                <Icon size={22} color="#c9a96e" />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, letterSpacing: '.06em', color: 'rgba(245,240,232,.65)', textAlign: 'center' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section style={{ background: '#161616', padding: '80px 40px', borderTop: '1px solid rgba(245,240,232,.06)', borderBottom: '1px solid rgba(245,240,232,.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
            {[
              ['200+', 'Verified Properties'],
              ['50K+', 'Happy Guests'],
              ['6', 'Cities Covered'],
              ['4.97★', 'Average Rating'],
            ].map(([num, label], i) => (
              <div key={label} style={{ textAlign: 'center', padding: '40px 24px', borderRight: i < 3 ? '1px solid rgba(245,240,232,.08)' : 'none' }}>
                <div className="stat-num">{num}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,.45)', marginTop: 12 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section id="experiences-reviews" style={{ background: '#0f0f0f', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 64 }}>
            <div className="section-label">Guest Stories</div>
            <div className="gold-line" />
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 300 }}>
              Trusted by <em style={{ color: '#c9a96e' }}>Travellers</em>
            </h2>
          </div>
          <div className="testi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {testimonials.map(t => (
              <div key={t.name} className="testi-card">
                <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
                  {[...Array(t.rating)].map((_, i) => <Star key={i} size={13} fill="#c9a96e" color="#c9a96e" />)}
                </div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300, lineHeight: 1.65, color: 'rgba(245,240,232,.82)', marginBottom: 28, fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderTop: '1px solid rgba(245,240,232,.08)', paddingTop: 20 }}>
                  <div style={{ width: 42, height: 42, background: 'rgba(201,169,110,.15)', border: '1px solid rgba(201,169,110,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: '#c9a96e', flexShrink: 0 }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: '#f5f0e8' }}>{t.name}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(245,240,232,.4)', marginTop: 2 }}>{t.role} · {t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: 480, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2072)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,15,15,.82)' }} />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '80px 40px', textAlign: 'center', width: '100%' }}>
          <div className="section-label">Join the Collection</div>
          <div className="gold-line" style={{ margin: '20px auto' }} />
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 60px)', fontWeight: 300, marginBottom: 20 }}>
            List Your Property<br /><em style={{ color: '#c9a96e' }}>with LEA Executive</em>
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: 'rgba(245,240,232,.65)', maxWidth: 500, margin: '0 auto 44px', lineHeight: 1.7 }}>
            Reach discerning travellers and property seekers across Kenya and beyond.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => router.push('/login')}>Get Started <ArrowRight size={14} /></button>
            <button className="btn-outline" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>Learn More</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer id="contact" style={{ background: '#161616', borderTop: '1px solid rgba(245,240,232,.08)', padding: '80px 40px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 64 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, border: '1px solid #c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} color="#c9a96e" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500, color: '#f5f0e8' }}>LEA Executive</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(201,169,110,.7)' }}>Luxury Residences</div>
                </div>
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(245,240,232,.5)', lineHeight: 1.8, maxWidth: 280, marginBottom: 28 }}>
                Curating exceptional stays and premium property management across Kenya's most desirable locations.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { icon: <Phone size={13} />, text: '+254 700 123 456' },
                  { icon: <Mail size={13} />, text: 'hello@leaexecutive.com' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(245,240,232,.5)', marginBottom: 10, width: '100%' }}>
                    <span style={{ color: '#c9a96e', display: 'flex' }}>{icon}</span> {text}
                  </div>
                ))}
              </div>
            </div>

            {[
              { title: 'Explore', links: ['Stays', 'Experiences', 'Services', 'List Property'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Press', 'Partners'] },
              { title: 'Support', links: ['Help Center', 'Safety', 'Cancellations', 'Accessibility'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 20 }}>{col.title}</div>
                {col.links.map(link => (
                  <button key={link} style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(245,240,232,.5)', marginBottom: 12, textAlign: 'left', transition: 'color .2s', padding: 0 }}
                    onMouseOver={e => (e.currentTarget.style.color = '#c9a96e')}
                    onMouseOut={e => (e.currentTarget.style.color = 'rgba(245,240,232,.5)')}
                    onClick={() => router.push('/login')}>{link}</button>
                ))}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(245,240,232,.08)', paddingTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(245,240,232,.3)' }}>© 2025 LEA Executive — Luxury Rentals & Residences. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy', 'Terms', 'Cookies'].map(l => (
                <span key={l} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(245,240,232,.3)', cursor: 'pointer' }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}