"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Inter } from "next/font/google";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Users,
  Home,
  Send,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Mail,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

interface ViewingListing {
  id: string;
  title: string;
  location: string;
  price: number;
  image_url: string;
}

interface ListingOwner {
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  kyc_verified: boolean;
}

const isValidPhone = (phone?: string | null) =>
  !!phone && /^(?:\+?254|0)?7\d{8}$/.test(phone.replace(/\s/g, ""));

const isValidEmail = (email?: string | null) =>
  !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const toWhatsAppDigits = (phone: string) => {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = "254" + clean.substring(1);
  if (!clean.startsWith("254")) clean = "254" + clean;
  return clean;
};

const STEPS = ["Personal Info", "Preferences", "Schedule", "Confirm"];

const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Townhouse",
  "Penthouse",
  "Studio",
  "Student Housing",
];
const TIME_SLOTS = [
  "9:00 AM – 10:30 AM",
  "11:00 AM – 12:30 PM",
  "2:00 PM – 3:30 PM",
  "4:00 PM – 5:30 PM",
];
const GROUP_SIZES = [
  "1 Person",
  "2 People",
  "3 People",
  "4 People",
  "5+ People",
];
const URGENCY_OPTIONS = [
  "Within 1 week",
  "Within 1 month",
  "No rush — just looking",
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ViewingPage() {
  return (
    <Suspense fallback={null}>
      <ViewingPageInner />
    </Suspense>
  );
}

function pillClass(active: boolean) {
  return `text-sm font-medium px-3.5 py-2.5 rounded-xl border transition-colors text-left ${
    active
      ? "border-neutral-900 bg-neutral-900 text-white"
      : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
  }`;
}

function ViewingPageInner() {
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listingId");
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [listing, setListing] = useState<ViewingListing | null>(null);
  const [owner, setOwner] = useState<ListingOwner | null>(null);

  useEffect(() => {
    if (!listingId) return;
    (async () => {
      const { data: listingData } = await supabase
        .from("listings")
        .select("id, title, location, price, image_url, created_by")
        .eq("id", listingId)
        .maybeSingle();

      if (!listingData) return;
      setListing(listingData);

      const { data: ownerData } = await supabase
        .from("profiles")
        .select("full_name, phone_number, email, kyc_verified")
        .eq("id", listingData.created_by)
        .maybeSingle();

      if (ownerData) setOwner(ownerData);
    })();
  }, [listingId]);

  // Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    propertyType: "",
    groupSize: "",
    budget: "",
    urgency: "",
    timeSlot: "",
    message: "",
    agreed: false,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Calendar helpers
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const isDisabled = (d: Date) => d < today || d.getDay() === 0;
  const isSelected = (d: Date) =>
    selectedDate?.toDateString() === d.toDateString();

  const calDays = () => {
    const total = daysInMonth(calYear, calMonth);
    const start = firstDayOfMonth(calYear, calMonth);
    const days: (Date | null)[] = Array(start).fill(null);
    for (let i = 1; i <= total; i++) days.push(new Date(calYear, calMonth, i));
    return days;
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  const canNext = () => {
    if (step === 0)
      return form.firstName && form.lastName && form.email && form.phone;
    if (step === 1) return form.propertyType && form.groupSize && form.urgency;
    if (step === 2) return selectedDate && form.timeSlot;
    return form.agreed;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch("/api/viewing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          propertyType: form.propertyType,
          preferredDate: selectedDate
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
            : "",
          preferredTime: form.timeSlot,
          message: form.message,
          groupSize: form.groupSize,
          budget: form.budget,
          urgency: form.urgency,
          agreeToTerms: form.agreed,
          listingId: listingId || undefined,
          tenantId: sessionData.session?.user?.id,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Request failed");
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const waMessage = listing
    ? `Hi, I'd like to schedule a viewing for "${listing.title}"${selectedDate ? ` on ${selectedDate.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}` : ""}${form.timeSlot ? ` (${form.timeSlot})` : ""}. My name is ${form.firstName} ${form.lastName}.`
    : "";
  const waLink =
    owner && isValidPhone(owner.phone_number)
      ? `https://wa.me/${toWhatsAppDigits(owner.phone_number as string)}?text=${encodeURIComponent(waMessage)}`
      : null;
  const mailLink =
    owner && isValidEmail(owner.email)
      ? `mailto:${owner.email}?subject=${encodeURIComponent(`Viewing request: ${listing?.title || "your property"}`)}&body=${encodeURIComponent(waMessage)}`
      : null;

  // ── Success ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className={`${inter.className} min-h-screen bg-neutral-50 flex items-center justify-center p-6`}>
        <div className="bg-white border border-neutral-200 rounded-2xl p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <p className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-2">Confirmed</p>
          <h2 className="text-2xl font-bold text-neutral-900 mb-3">Viewing Scheduled</h2>
          <p className="text-sm text-neutral-500 leading-relaxed mb-6">
            Thank you, {form.firstName}. Your viewing request has been received.
            We&apos;ll confirm your appointment within 24 hours via email or phone.
          </p>

          {selectedDate && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 mb-6 text-left">
              <p className="text-xs font-semibold tracking-wide uppercase text-neutral-400 mb-1">Requested Slot</p>
              <p className="text-base font-semibold text-neutral-900">
                {selectedDate.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-sm text-neutral-500 mt-0.5">{form.timeSlot}</p>
            </div>
          )}

          <div className="space-y-2 mb-2">
            {[
              { emoji: "📱", t: "We'll confirm by SMS or call" },
              { emoji: "🏠", t: "Prepare your questions" },
            ].map(({ emoji, t }) => (
              <p key={t} className="text-sm text-neutral-500">{emoji} {t}</p>
            ))}
          </div>

          {(waLink || mailLink) && (
            <div className="flex flex-col gap-2.5 mt-6 pt-6 border-t border-neutral-100">
              <p className="text-xs font-semibold tracking-wide uppercase text-neutral-400 mb-1">Reach the owner directly</p>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3 rounded-full bg-[#25D366] text-white hover:opacity-90 transition-opacity"
                >
                  <MessageCircle className="w-4 h-4" /> Message on WhatsApp
                </a>
              )}
              {mailLink && (
                <a
                  href={mailLink}
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3 rounded-full border border-neutral-200 text-neutral-900 hover:bg-neutral-50 transition-colors"
                >
                  <Mail className="w-4 h-4" /> Email Owner
                </a>
              )}
            </div>
          )}

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold px-6 py-3 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} min-h-screen bg-neutral-50`}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-neutral-100">
        <div className="px-6 py-5 max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/listings" className="text-neutral-500 hover:text-neutral-900 transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-neutral-900 truncate">Schedule a Viewing</h1>
              <p className="text-sm text-neutral-500 truncate">{listing ? listing.title : "Pick the date and time that works for you"}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i <= step ? "bg-neutral-900" : "bg-neutral-200"
                  }`}
                />
                {i < STEPS.length - 1 && <div className="w-4 h-px bg-neutral-200" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* ── MAIN FORM ─────────────────────── */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-2">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">
              {step === 0 && "Who are you?"}
              {step === 1 && "What are you looking for?"}
              {step === 2 && "Pick a date & time"}
              {step === 3 && "Review & Confirm"}
            </h2>
          </div>

          {/* ── STEP 0: Personal Info ─────────── */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-neutral-900 mb-2 block">First Name *</Label>
                  <Input
                    placeholder="Jane"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-neutral-900 mb-2 block">Last Name *</Label>
                  <Input
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <Label className="text-neutral-900 mb-2 block">Email Address *</Label>
                <Input
                  type="email"
                  placeholder="jane.doe@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-neutral-900 mb-2 block">Phone Number *</Label>
                <Input
                  type="tel"
                  placeholder="+254 700 123 456"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                />
              </div>
            </div>
          )}

          {/* ── STEP 1: Preferences ──────────── */}
          {step === 1 && (
            <div className="flex flex-col gap-7">
              <div>
                <Label className="text-neutral-900 mb-2.5 block">Property Type *</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {PROPERTY_TYPES.map((t) => (
                    <button key={t} className={pillClass(form.propertyType === t)} onClick={() => set("propertyType", t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-neutral-900 mb-2.5 block">Group Size *</Label>
                <div className="flex flex-wrap gap-2.5">
                  {GROUP_SIZES.map((g) => (
                    <button key={g} className={pillClass(form.groupSize === g)} onClick={() => set("groupSize", g)}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-neutral-900 mb-2.5 block">Move-in Urgency *</Label>
                <div className="flex flex-col gap-2">
                  {URGENCY_OPTIONS.map((u) => (
                    <button key={u} className={pillClass(form.urgency === u)} onClick={() => set("urgency", u)}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-neutral-900 mb-2 block">Budget Range (KES / month)</Label>
                <Input
                  placeholder="e.g. 45,000 – 80,000"
                  value={form.budget}
                  onChange={(e) => set("budget", e.target.value)}
                  className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Schedule ─────────────── */}
          {step === 2 && (
            <div className="flex flex-col gap-8">
              <div>
                <Label className="text-neutral-900 mb-2.5 block">
                  Preferred Date *{" "}
                  {selectedDate && (
                    <span className="text-neutral-500 font-normal">
                      — {selectedDate.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  )}
                </Label>
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 inline-block min-w-70">
                  <div className="flex items-center justify-between mb-5">
                    <button
                      onClick={prevMonth}
                      className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:border-neutral-400 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-base font-semibold text-neutral-900">{MONTHS[calMonth]} {calYear}</span>
                    <button
                      onClick={nextMonth}
                      className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:border-neutral-400 transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-1.5">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <div key={d} className="w-9 text-center text-[10px] font-semibold tracking-wide uppercase text-neutral-400 py-1">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calDays().map((d, i) => {
                      if (!d) return <div key={i} />;
                      const dis = isDisabled(d);
                      const sel = isSelected(d);
                      const isToday = d.toDateString() === today.toDateString();
                      return (
                        <div
                          key={i}
                          onClick={() => !dis && setSelectedDate(d)}
                          className={`w-9 h-9 flex items-center justify-center text-sm rounded-lg transition-colors ${
                            dis
                              ? "text-neutral-300 cursor-not-allowed"
                              : sel
                              ? "bg-neutral-900 text-white font-semibold cursor-pointer"
                              : isToday
                              ? "border border-neutral-300 text-neutral-900 cursor-pointer"
                              : "text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                          }`}
                        >
                          {d.getDate()}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-3">Sundays unavailable</p>
                </div>
              </div>

              <div>
                <Label className="text-neutral-900 mb-2.5 block">Preferred Time *</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {TIME_SLOTS.map((t) => (
                    <button key={t} className={pillClass(form.timeSlot === t)} onClick={() => set("timeSlot", t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-neutral-900 mb-2 block">Additional Notes</Label>
                <Textarea
                  placeholder="Any specific units you'd like to see, accessibility requirements, or questions..."
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  className="bg-white border-neutral-200 text-neutral-900 rounded-xl min-h-24"
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirm ──────────────── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              {[
                { label: "Personal", items: [`${form.firstName} ${form.lastName}`, form.email, form.phone] },
                {
                  label: "Preferences",
                  items: [form.propertyType, form.groupSize, form.urgency, form.budget ? `Budget: ${form.budget}` : null].filter(Boolean) as string[],
                },
                {
                  label: "Viewing",
                  items: [
                    selectedDate?.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) || "",
                    form.timeSlot,
                  ],
                },
              ].map(({ label, items }) => (
                <div key={label} className="bg-neutral-50 border border-neutral-200 rounded-xl p-5">
                  <p className="text-xs font-semibold tracking-wide uppercase text-neutral-400 mb-2.5">{label}</p>
                  {items.map((item) => (
                    <p key={item} className="text-sm text-neutral-700 mb-1.5 pl-2.5 border-l-2 border-neutral-200">{item}</p>
                  ))}
                </div>
              ))}

              {form.message && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5">
                  <p className="text-xs font-semibold tracking-wide uppercase text-neutral-400 mb-2.5">Notes</p>
                  <p className="text-sm text-neutral-600 leading-relaxed">{form.message}</p>
                </div>
              )}

              <div
                onClick={() => set("agreed", !form.agreed)}
                className={`flex items-start gap-3.5 p-5 rounded-xl border cursor-pointer transition-colors ${
                  form.agreed ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                }`}
              >
                <div
                  className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    form.agreed ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
                  }`}
                >
                  {form.agreed && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  I agree to the terms and conditions. I understand this is a viewing request and LEA will confirm the appointment within 24 hours.
                </p>
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Navigation ───────────────────── */}
          <div className="flex gap-3 mt-10 pt-8 border-t border-neutral-100">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="bg-white border-neutral-200 text-neutral-900 rounded-full hover:bg-neutral-50"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="button"
                disabled={!canNext()}
                onClick={() => setStep((s) => s + 1)}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-full"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!form.agreed || submitting}
                onClick={handleSubmit}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-full"
              >
                {submitting ? "Scheduling..." : (<><Send className="w-4 h-4" /> Schedule Viewing</>)}
              </Button>
            )}
          </div>
        </div>

        {/* ── SIDEBAR ──────────────────────── */}
        <div className="hidden lg:flex flex-col gap-5">
          {/* What to expect */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">What to Expect</p>
            {[
              { icon: <Clock className="w-3.5 h-3.5 text-neutral-600" />, t: "30–45 min tour", s: "Comprehensive walkthrough" },
              { icon: <Users className="w-3.5 h-3.5 text-neutral-600" />, t: "Personal guide", s: "One-on-one with manager" },
              { icon: <Home className="w-3.5 h-3.5 text-neutral-600" />, t: "Multiple units", s: "See available options" },
            ].map(({ icon, t, s }, i, arr) => (
              <div key={t} className={`flex gap-3 ${i < arr.length - 1 ? "mb-4 pb-4 border-b border-neutral-100" : ""}`}>
                <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">{icon}</div>
                <div>
                  <p className="text-sm font-medium text-neutral-900">{t}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{s}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Listing summary */}
          {listing ? (
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
              <div className="relative h-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <p className="font-semibold text-neutral-900 truncate">{listing.title}</p>
                  {owner?.kyc_verified && (
                    <span title="Verified owner"><ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0" /></span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-3">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{listing.location}</span>
                </div>
                <p className="text-lg font-bold text-neutral-900">KES {listing.price.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-3">Browsing Properties</p>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Schedule a viewing from a specific listing to see its details here.
              </p>
            </div>
          )}

          {/* Progress */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">Your Progress</p>
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2.5 mb-3 last:mb-0">
                <div
                  className={`w-5.5 h-5.5 rounded-full border flex items-center justify-center shrink-0 ${
                    i < step ? "bg-neutral-900 border-neutral-900" : i === step ? "border-neutral-900" : "border-neutral-200"
                  }`}
                >
                  {i < step ? (
                    <CheckCircle className="w-3 h-3 text-white" />
                  ) : (
                    <span className={`text-[10px] ${i === step ? "text-neutral-900" : "text-neutral-300"}`}>{i + 1}</span>
                  )}
                </div>
                <span className={`text-sm ${i <= step ? "text-neutral-900" : "text-neutral-400"}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
