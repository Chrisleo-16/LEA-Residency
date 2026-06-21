import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowUpRight, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const navLinks = [
    ['How It Works', 'howitworks'], 
    ['Features', 'features'], 
    ['Gallery', 'gallery'], 
    ['Contact', 'contact']
  ];

  return (
    <>
      <style>{`
        @media (min-width: 769px) { .hide-mobile { display: flex !important; } .show-mobile { display: none !important; } }
        @media (max-width: 768px) { .hide-mobile { display: none !important; } .show-mobile { display: flex !important; } }
      `}</style>

      <nav style={{
        position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, height: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 24px',
        background: '#ffffff', borderRadius: 999,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        border: '1px solid #f0f0f0', width: '90%', maxWidth: 1000,
      }}>
        
        {/* LEFT: Hamburger (Mobile) / Logo (Desktop) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="show-mobile" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', border: "1px solid #ff5a36", borderRadius: '50%' }}>
              <Building2 size={16} color="#ff5a36" />
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600 }}>LEA</span>
          </div>
        </div>

        {/* CENTER: Links (Desktop Only) */}
        <div className="hide-mobile" style={{ display: 'flex', gap: 32 }}>
          {navLinks.map(([label, id]) => (
            <button key={id} onClick={() => router.push(`/#${id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#444' }}>
              {label}
            </button>
          ))}
        </div>

        {/* RIGHT: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="hide-mobile" onClick={() => router.push('/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Login</button>
          <button onClick={() => router.push('/login')} style={{ padding: '8px 16px', borderRadius: 999, background: '#ff5a36', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
            Sign Up <ArrowUpRight size={14} />
          </button>
        </div>
      </nav>

      {/* MOBILE MENU DRAWER */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
          background: '#fff', zIndex: 99, padding: '100px 40px', display: 'flex', flexDirection: 'column', gap: 24
        }}>
          {navLinks.map(([label, id]) => (
            <button key={id} onClick={() => { setMobileMenuOpen(false); router.push(`/#${id}`); }} style={{ fontSize: 24, textAlign: 'left', border: 'none', background: 'none' }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}