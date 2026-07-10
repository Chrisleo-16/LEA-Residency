"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  Building2,
  MessageSquare,
  Receipt,
  ShieldCheck,
  Menu,
  X,
  MapPin,
  BedDouble,
  Bath,
  ChevronLeft,
  ChevronRight,
  Star,
  Phone,
  Mail,
} from "lucide-react";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { useRouteLoader } from "@/components/RouteLoaderProvider";
import { createClient } from "@/lib/supabase/client";
import type { Listing } from "@/app/listings/page";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const ROUTE_LINKS: Record<string, string> = {
  listings: "/listings",
};

const navLinks = [
  ["How It Works", "steps"],
  ["Listings", "listings"],
  ["FAQs", "faq"],
];

const valueProps = [
  {
    icon: ShieldCheck,
    title: "Verified Landlords",
    desc: "Every landlord on the platform is identity-checked before they can list a property.",
  },
  {
    icon: Receipt,
    title: "M-Pesa Integrated",
    desc: "Rent is paid and reconciled automatically via Paybill — no manual confirmation.",
  },
  {
    icon: MessageSquare,
    title: "Nairobi-based Support",
    desc: "Real people, on the ground in Kenya, for tenants and landlords alike.",
  },
];

const steps = [
  {
    step: "01",
    title: "Search Listings",
    desc: "Browse verified properties across Kenya by location, price, and size.",
  },
  {
    step: "02",
    title: "Schedule a Viewing",
    desc: "Book a viewing directly with the landlord or their agent, in-app.",
  },
  {
    step: "03",
    title: "Apply & Verify",
    desc: "Submit your details once. No repeat paperwork across properties.",
  },
  {
    step: "04",
    title: "Move In & Pay",
    desc: "Pay rent via M-Pesa from day one, logged automatically every month.",
  },
];

const testimonials = [
  {
    name: 'Leo "Informed" A',
    role: "Resident Tenant",
    avatar: "AW",
    rating: 5,
    text: "Paying rent through the app is so seamless. I send to the Paybill and a few seconds later it shows confirmed. No more calling to check if it went through.",
  },
  {
    name: "Chris Evans",
    role: "Resident Tenant",
    avatar: "JM",
    rating: 5,
    text: "I logged a plumbing issue on Monday morning. By Wednesday it was already resolved and marked done in the app. This is how management should work.",
  },
  {
    name: "Sophie Leo",
    role: "Resident Tenant",
    avatar: "FN",
    rating: 5,
    text: "The community chat is great. We know immediately when there's a water outage or a notice from management. Everyone stays on the same page.",
  },
];

const faqs = [
  {
    q: "Okay but what actually is this?",
    a: "A dashboard for one building, plus a growing marketplace. LEA Executive Residency has its own app where tenants pay rent, message management, and log requests. On top of that, landlords across Kenya can list other properties for tenants to browse.",
  },
  {
    q: "Is this a rental listing site like the others?",
    a: "Both, actually. LEA Executive Residency has its own dedicated tenant portal — that's this app, day-to-day. But the platform is also growing a Kenyan listings marketplace, where other landlords list properties and tenants can browse before they move in.",
  },
  {
    q: "How is this different from a regular landlord-tenant relationship?",
    a: "Most of those run on memory and goodwill — a call here, a text there, hoping it was seen. We put it on record instead. Every message, payment, and request has a timestamp and a status.",
  },
  {
    q: "Who actually gets my rent money?",
    a: "Your landlord, directly. Payments go straight to the building's M-Pesa Paybill — LEA Executive never holds your money. The app reads the confirmation the moment M-Pesa sends it.",
  },
  {
    q: "What happens to a maintenance request after I submit it?",
    a: "It moves through three states you can actually see: submitted, in progress, resolved. No more wondering if anyone read it.",
  },
  {
    q: "Can my landlord see things I do not want them to?",
    a: "No. Your private chat with management stays private. Row Level Security means only you and your property manager can see your conversations, payments, and records.",
  },
  {
    q: "What if I am not a tenant here yet?",
    a: "Then browse Listings — landlords across Kenya list available properties there. If you want LEA Executive Residency specifically, reach out through Contact below.",
  },
  {
    q: "Is my data actually safe?",
    a: "Yes — and we mean that specifically, not as a slogan. Read the Privacy Policy for exactly what we collect, why, and who can see it.",
  },
];

export default function Home() {
  const router = useRouter();
  const { startLoading } = useRouteLoader();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [listingsPage, setListingsPage] = useState(0);
  const [marketListings, setMarketListings] = useState<Listing[]>([]);
  const [marketListingsLoading, setMarketListingsLoading] = useState(true);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(9)
      .then(({ data, error }) => {
        if (!error) setMarketListings(data || []);
        setMarketListingsLoading(false);
      });
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const goTo = (path: string) => {
    startLoading(path);
    router.push(path);
  };

  const pageCount = Math.max(1, Math.ceil(marketListings.length / 3));
  const visibleListings = marketListings.slice(
    listingsPage * 3,
    listingsPage * 3 + 3,
  );
  const testimonial = testimonials[testimonialIndex];

  return (
    <div className={`${jakarta.className} bg-white text-neutral-900 antialiased`}>
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-lg bg-neutral-900 flex items-center justify-center">
              <Building2 className="w-4.5 h-4.5 text-white" strokeWidth={2} />
            </div>
            <span className="text-lg font-bold tracking-tight">LEA Executive</span>
          </button>

          <nav className="hidden md:flex items-center gap-10">
            {navLinks.map(([label, id]) => (
              <button
                key={id}
                onClick={() => (ROUTE_LINKS[id] ? goTo(ROUTE_LINKS[id]) : scrollTo(id))}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => goTo("/login")}
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => goTo("/login")}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              Get Started
            </button>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 -mr-2"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* ── MOBILE MENU ────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col p-6">
          <div className="flex items-center justify-between mb-12">
            <span className="text-lg font-bold">LEA Executive</span>
            <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-start gap-8 justify-center">
            {navLinks.map(([label, id]) => (
              <button
                key={id}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  ROUTE_LINKS[id] ? goTo(ROUTE_LINKS[id]) : scrollTo(id);
                }}
                className="text-3xl font-bold text-neutral-900"
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setIsMobileMenuOpen(false); goTo("/login"); }}
            className="w-full rounded-full bg-neutral-900 text-white font-semibold py-4 mb-4"
          >
            Get Started
          </button>
          <button
            onClick={() => { setIsMobileMenuOpen(false); goTo("/login"); }}
            className="w-full rounded-full border border-neutral-200 font-semibold py-4"
          >
            Login
          </button>
        </div>
      )}

      {/* ── HERO ───────────────────────────────────────────── */}
      <section ref={heroRef} className="relative bg-neutral-950 text-white overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/lea-building.jpg"
            alt="Modern residential building"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/30" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-20 md:pt-32 md:pb-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5 text-xs uppercase tracking-widest text-white/80 mb-8">
            #1 Kenyan Real Estate Platform
          </div>

          <h1 className="font-extrabold uppercase leading-[0.92] tracking-tight text-[15vw] sm:text-7xl md:text-8xl mb-8 max-w-4xl">
            Smart
            <br />
            Property
            <br />
            Management.
          </h1>

          <p className="max-w-md text-white/70 text-base md:text-lg leading-relaxed mb-16">
            LEA Executive helps Kenyan tenants and landlords manage rent,
            maintenance, and communication — and browse verified listings
            across the country.
          </p>

          <div className="flex flex-col md:flex-row gap-10 md:gap-16 md:items-end justify-between border-t border-white/15 pt-10">
            <div className="grid sm:grid-cols-2 gap-10 max-w-xl">
              <p className="text-sm text-white/60 leading-relaxed">
                Browse verified listings and connect directly with landlords
                across Kenya — no middlemen, no fake ads.
              </p>
              <p className="text-sm text-white/60 leading-relaxed">
                Pay rent via M-Pesa, log maintenance requests, and message
                management, all logged automatically.
              </p>
            </div>
            <button
              onClick={() => goTo("/login")}
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-white text-neutral-900 font-semibold px-8 py-4 hover:bg-neutral-100 transition-colors"
            >
              Get Started <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── WHY US ─────────────────────────────────────────── */}
      <section className="bg-white py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <div className="w-10 h-0.5 bg-neutral-900 mb-6" />
              <p className="text-xs uppercase tracking-widest text-neutral-400">Why Us</p>
            </div>
            <p className="text-2xl md:text-3xl font-medium leading-snug text-neutral-800">
              We are your trusted partner in Kenyan real estate. With verified
              landlords, transparent pricing, and M-Pesa built in from day
              one, we help tenants find a home and landlords manage one —
              without the guesswork.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-10 mt-20 pt-16 border-t border-neutral-100">
            {valueProps.map(({ icon: Icon, title, desc }) => (
              <div key={title}>
                <Icon className="w-6 h-6 text-neutral-900 mb-4" strokeWidth={1.5} />
                <h3 className="font-semibold text-neutral-900 mb-2">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROMO ──────────────────────────────────────────── */}
      <section className="bg-neutral-50 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-neutral-900">
              Property Management,
              <br />
              Nairobi to Mombasa.
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-8 max-w-md">
              Whether you manage one building or list a single unit, LEA
              Executive gives you M-Pesa reconciliation, maintenance
              tracking, and tenant communication in one dashboard — free of
              chaotic WhatsApp threads.
            </p>
            <button
              onClick={() => goTo("/login")}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 hover:border-neutral-900 font-semibold px-6 py-3 transition-colors"
            >
              Find out more <span>→</span>
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/download.jpg"
              alt="Kenyan residential apartment"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── LISTINGS ───────────────────────────────────────── */}
      <section id="featured-listings" className="bg-white py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-16">
            <div>
              <div className="w-10 h-0.5 bg-neutral-900 mb-6" />
              <h2 className="text-4xl md:text-5xl font-bold text-neutral-900">
                Featured Listings
              </h2>
              <p className="text-neutral-500 mt-4 max-w-lg">
                Verified properties from landlords across Kenya, browsed and
                booked directly.
              </p>
            </div>
            {marketListings.length > 3 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400 mr-1">
                  {String(listingsPage + 1).padStart(2, "0")}/{String(pageCount).padStart(2, "0")}
                </span>
                <button
                  onClick={() => setListingsPage((p) => (p - 1 + pageCount) % pageCount)}
                  className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center hover:border-neutral-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setListingsPage((p) => (p + 1) % pageCount)}
                  className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center hover:border-neutral-900 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {marketListingsLoading ? (
            <div className="text-center py-20 text-neutral-400 text-sm">Loading listings...</div>
          ) : marketListings.length === 0 ? (
            <div className="text-center py-20 text-neutral-400 text-sm">
              No listings yet — be the first landlord to list a property.
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {visibleListings.map((listing) => (
                <div
                  key={listing.id}
                  onClick={() => goTo("/listings")}
                  className="rounded-2xl overflow-hidden border border-neutral-100 hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <div
                    className="h-56 bg-neutral-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${listing.image_url})` }}
                  />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-neutral-900 truncate">{listing.title}</h3>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 shrink-0 ml-2">
                        For Rent
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-neutral-500 mb-4">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{listing.location}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-neutral-400">Rent</p>
                        <p className="font-semibold text-neutral-900">
                          KES {listing.price?.toLocaleString("en-KE")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-neutral-500 text-sm">
                        <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{listing.bedrooms}</span>
                        <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{listing.bathrooms}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-16">
            <button
              onClick={() => goTo("/listings")}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-8 py-4 transition-colors"
            >
              Browse All Listings <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── STEPS ──────────────────────────────────────────── */}
      <section id="steps" className="bg-neutral-50 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-16">
            <div className="w-10 h-0.5 bg-neutral-900 mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900">
              4 Steps to Your New Home.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {steps.map(({ step, title, desc }) => (
              <div key={step}>
                <div className="text-6xl font-extrabold text-neutral-200 mb-6 leading-none">
                  {step}
                </div>
                <h3 className="font-semibold text-lg text-neutral-900 mb-3">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────── */}
      <section className="bg-white py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid md:grid-cols-3 gap-16 items-center">
          <div>
            <div className="w-10 h-0.5 bg-neutral-900 mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900">
              Our Testimoni.
            </h2>
          </div>
          <div className="md:col-span-2">
            <p className="text-2xl md:text-3xl font-medium leading-snug text-neutral-800 mb-10">
              &ldquo;{testimonial.text}&rdquo;
            </p>
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center font-semibold text-neutral-700">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{testimonial.name}</p>
                  <p className="text-sm text-neutral-500">{testimonial.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                  <span className="text-sm text-neutral-500 ml-1">{testimonial.rating}/5</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTestimonialIndex((i) => (i - 1 + testimonials.length) % testimonials.length)}
                    className="w-9 h-9 rounded-full border border-neutral-200 flex items-center justify-center hover:border-neutral-900 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTestimonialIndex((i) => (i + 1) % testimonials.length)}
                    className="w-9 h-9 rounded-full border border-neutral-200 flex items-center justify-center hover:border-neutral-900 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section id="faq" className="bg-neutral-50 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-16">
            <div>
              <div className="w-10 h-0.5 bg-neutral-900 mb-6" />
              <h2 className="text-4xl md:text-5xl font-bold text-neutral-900">
                Top Questions. Answered.
              </h2>
            </div>
            <p className="text-neutral-500 max-w-sm">
              No jargon, no dodging. Just what this app does, who it&apos;s
              for, and why it&apos;s not another rental site.
            </p>
          </div>

          <Accordion type="single" collapsible defaultValue="item-0" className="border-t border-neutral-200">
            {faqs.map((item, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border-neutral-200">
                <AccordionTrigger className="py-6 text-lg md:text-xl font-medium text-neutral-900 hover:no-underline">
                  <span className="flex items-baseline gap-5">
                    <span className="text-sm text-neutral-300 font-medium">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {item.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-neutral-500 leading-relaxed pl-10 max-w-2xl">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="flex items-center gap-3 flex-wrap mt-10 text-sm">
            <span className="text-neutral-500">Want the long version?</span>
            <button onClick={() => goTo("/privacy")} className="text-neutral-900 font-medium underline underline-offset-4">
              Read the Privacy Policy
            </button>
            <span className="text-neutral-300">·</span>
            <button onClick={() => goTo("/terms")} className="text-neutral-900 font-medium underline underline-offset-4">
              Read the Terms & Conditions
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="relative bg-neutral-950 text-white py-32 md:py-44 overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/download.jpg"
            alt="Kenyan residential building"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Find Your Perfect Home Today.
          </h2>
          <p className="text-white/70 mb-10 max-w-lg mx-auto">
            Join tenants and landlords managing their homes and finding new
            ones, all in one platform built for Kenya.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => goTo("/login")}
              className="rounded-full bg-white text-neutral-900 font-semibold px-8 py-4 hover:bg-neutral-100 transition-colors"
            >
              Get Started
            </button>
            <button
              onClick={() => goTo("/listings")}
              className="rounded-full border border-white/30 font-semibold px-8 py-4 hover:border-white transition-colors"
            >
              Browse Listings
            </button>
          </div>
        </div>
        <div
          aria-hidden
          className="absolute -bottom-6 left-0 right-0 text-center font-extrabold uppercase leading-none text-[16vw] text-white/5 select-none pointer-events-none whitespace-nowrap"
        >
          LEA Executive
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-white border-t border-neutral-100 py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-lg bg-neutral-900 flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5 text-white" strokeWidth={2} />
                </div>
                <span className="font-bold">LEA Executive</span>
              </div>
              <p className="text-sm text-neutral-500 leading-relaxed max-w-xs mb-6">
                A digital-first residential platform in Kenya. Tenants manage
                rent, requests, and communication — landlords manage their
                buildings and list new ones.
              </p>
              <div className="flex flex-col gap-2.5 text-sm text-neutral-600">
                <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +254 799 956574</span>
                <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> cbempirefx@gmail.com</span>
                <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Nairobi, Kenya</span>
              </div>
            </div>

            {[
              {
                title: "Platform",
                links: ["Tenant Dashboard", "M-Pesa Payments", "Maintenance", "Community Chat"],
                path: "/login",
              },
              {
                title: "Support",
                links: ["How It Works", "Contact", "Policy Docs", "Sign In"],
                path: "/login",
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs uppercase tracking-widest text-neutral-400 mb-5">{col.title}</p>
                <div className="flex flex-col gap-3">
                  {col.links.map((link) => (
                    <button
                      key={link}
                      onClick={() => goTo(link === "Contact" ? "/contact" : col.path)}
                      className="text-sm text-neutral-600 hover:text-neutral-900 text-left transition-colors"
                    >
                      {link}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-400 mb-5">Get in Touch</p>
              <p className="text-sm text-neutral-500 mb-4">
                Have a property to list, or a question about your tenancy?
              </p>
              <button
                onClick={() => goTo("/contact")}
                className="w-full rounded-full bg-neutral-900 text-white text-sm font-semibold py-3 hover:bg-neutral-800 transition-colors"
              >
                Contact Us
              </button>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-neutral-400">
              &copy; {new Date().getFullYear()} LEA Executive Residency. All rights reserved.
            </span>
            <div className="flex gap-8">
              {[
                ["Privacy Policy", "/privacy"],
                ["Terms of Service", "/terms"],
                ["Tenant Rights", "/tenant-rights"],
              ].map(([label, path]) => (
                <button key={path} onClick={() => goTo(path)} className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <InstallPrompt />
    </div>
  );
}
