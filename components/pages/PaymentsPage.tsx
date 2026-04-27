"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  X,
  Phone,
  CreditCard,
  Building2,
  TrendingUp,
  Calendar,
  Receipt,
  Trash2,
  Search,
  BadgeCheck,
  Download,
  RefreshCw,
  Droplets,
  Wrench,
} from "lucide-react";
import PayButton from "../payments/PaymentsButton";

const TZ = "Africa/Nairobi";
const toUTC = (s: string) => new Date(s.endsWith("Z") ? s : s + "Z");

interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  phone_number: string | null;
  mpesa_code: string | null;
  account_number: string | null;
  payment_month: string;
  payment_date: string;
  status: string;
  payment_method: string;
  notes: string | null;
  logged_by: string;
  profiles?: { full_name: string; email: string };
}

interface RentSetting {
  tenant_id: string;
  monthly_amount: number;
  due_day: number;
  unit_number: string | null;
  profiles?: { full_name: string; email: string; avatar_url: string | null };
}

interface PaymentsPageProps {
  user: User | null;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return (
    d
      .toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: TZ,
      })
      .replace(" ", " ") +
    "|" +
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  );
});

export default function PaymentsPage({ user }: PaymentsPageProps) {
  const [role, setRole] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentSettings, setRentSettings] = useState<RentSetting[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState(MONTHS[0].split("|")[1]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Manual log form states — landlord
  const [showLogForm, setShowLogForm] = useState(false);
  const [logTenantId, setLogTenantId] = useState("");
  const [logAmount, setLogAmount] = useState("");
  const [logMpesaCode, setLogMpesaCode] = useState("");
  const [logPhone, setLogPhone] = useState("");
  const [logMethod, setLogMethod] = useState("mpesa");
  const [logMonth, setLogMonth] = useState(MONTHS[0].split("|")[1]);
  const [logNotes, setLogNotes] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  // Rent settings form
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [settingsTenantId, setSettingsTenantId] = useState("");
  const [settingsAmount, setSettingsAmount] = useState("");
  const [settingsUnit, setSettingsUnit] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // STK Push states
  const [showPayModal, setShowPayModal] = useState(false);
  const [payPhone, setPayPhone] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  
  // ── Payment status calculator ─────────────────────────
  const getTenantPaymentStatus = (tenantId: string, month: string) => {
    const rs = rentSettings.find((r) => r.tenant_id === tenantId);
    const monthPayments = payments.filter(
      (p) => p.tenant_id === tenantId && p.payment_month === month,
    );
    const totalPaid = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
    const expected = rs?.monthly_amount || 0;
    const pending = Math.max(0, expected - totalPaid);
    const isComplete = expected > 0 && totalPaid >= expected;
    const isPartial = totalPaid > 0 && totalPaid < expected;

    return {
      totalPaid,
      expected,
      pending,
      isComplete,
      isPartial,
      hasNoSetting: expected === 0,
      payments: monthPayments,
    };
  };

  const showFeedback = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => {
      setError("");
      setSuccess("");
    }, 5000);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single();
    setRole(profile?.role || null);

    if (profile?.role === "landlord") {
      // Fetch all payments with tenant profile
      const { data: pays } = await supabase
        .from("payments")
        .select("*, profiles!payments_tenant_id_fkey(full_name, email)")
        .order("payment_date", { ascending: false });
      setPayments(pays || []);

      // Fetch all tenants
      const { data: tList } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, phone_number")
        .eq("role", "tenant");
      setTenants(tList || []);

      // Fetch rent settings
      const { data: rs } = await supabase
        .from("rent_settings")
        .select("*, profiles(full_name, email, avatar_url)");
      setRentSettings(rs || []);
    } else {
      // Tenant — own payments only
      const { data: pays } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", user!.id)
        .order("payment_date", { ascending: false });
      setPayments(pays || []);

      const { data: rs } = await supabase
        .from("rent_settings")
        .select("*")
        .eq("tenant_id", user!.id)
        .maybeSingle();
      if (rs) setRentSettings([rs]);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchData();

    const channel = supabase
      .channel("payments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rent_settings" },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, fetchData]);

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTenantId || !logAmount) return;
    setIsLogging(true);
    try {
      if (logMpesaCode) {
        const { data: existing } = await supabase
          .from("payments")
          .select("id")
          .eq("mpesa_code", logMpesaCode.toUpperCase())
          .maybeSingle();
        if (existing)
          throw new Error("This M-Pesa code has already been recorded.");
      }

      const { error } = await supabase.from("payments").insert({
        tenant_id: logTenantId,
        landlord_id: user!.id,
        amount: parseFloat(logAmount),
        phone_number: logPhone || null,
        mpesa_code: logMpesaCode ? logMpesaCode.toUpperCase() : null,
        payment_month: logMonth,
        payment_method: logMethod,
        notes: logNotes || null,
        logged_by: "landlord",
        status: "confirmed",
      });
      if (error) throw error;

      showFeedback("Payment logged successfully!");
      setLogTenantId("");
      setLogAmount("");
      setLogMpesaCode("");
      setLogPhone("");
      setLogNotes("");
      setShowLogForm(false);
      fetchData();
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setIsLogging(false);
    }
  };

  const handleSaveRentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsTenantId || !settingsAmount) return;
    setIsSavingSettings(true);
    try {
      const { error } = await supabase.from("rent_settings").upsert(
        {
          tenant_id: settingsTenantId,
          monthly_amount: parseFloat(settingsAmount),
          unit_number: settingsUnit || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      );
      if (error) throw error;
      showFeedback("Rent settings saved!");
      setShowSettingsForm(false);
      fetchData();
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const initiateSTKPush = async () => {
    if (!myRentSetting) {
      showFeedback(
        "Your rent amount is not set. Please contact landlord.",
        true,
      );
      return;
    }
    if (!payPhone || payPhone.length < 9) {
      showFeedback("Please enter a valid M-Pesa phone number", true);
      return;
    }

    setIsPaying(true);
    try {
      const res = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: myRentSetting.monthly_amount,
          phone: payPhone,
          tenantId: user!.id,
          month: activeMonth,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback(
        "Payment request sent. Please check your phone and enter PIN.",
      );
      setShowPayModal(false);
      setPayPhone("");

    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setIsPaying(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    await supabase.from("payments").delete().eq("id", id);
    showFeedback("Payment record deleted.");
    fetchData();
  };

  const formatDate = (s: string) =>
    toUTC(s).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: TZ,
    }).replace(',', ' ');

  // CSV Export Function
  const exportToCSV = () => {
    const monthPayments = payments.filter(p => p.payment_month === activeMonth);
    
    if (monthPayments.length === 0) {
      const monthName = MONTHS.find(m => m.split('|')[1] === activeMonth)?.split('|')[0] || 'Unknown';
      showFeedback(`No payments found for ${monthName}. Log some payments first!`, true);
      return;
    }
    
    // Create CSV headers
    const headers = [
      'Tenant Name',
      'Email',
      'Payment Type',
      'Amount (KES)',
      'M-Pesa Code',
      'Payment Date',
      'Payment Method',
      'Status',
      'Notes'
    ];

    // Create CSV rows
    const rows = monthPayments.map(payment => {
      const tenant = tenants.find(t => t.id === payment.tenant_id);
      const paymentType = getPaymentTypeFromNotes(payment.notes);
      
      return [
        tenant?.full_name || 'Unknown',
        tenant?.email || 'Unknown',
        paymentType,
        payment.amount.toString(),
        payment.mpesa_code || 'N/A',
        formatDate(payment.payment_date),
        payment.payment_method || 'M-Pesa',
        payment.status || 'confirmed',
        payment.notes || ''
      ];
    });

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const monthName = MONTHS.find(m => m.split('|')[1] === activeMonth)?.split('|')[0] || 'Unknown';
    link.setAttribute('href', url);
    link.setAttribute('download', `payment_ledger_${monthName.replace(' ', '_')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showFeedback(`Payment ledger for ${monthName} exported successfully!`);
  };

  // Smart Sync PayHero Transactions Function
  const smartSyncPayHero = async () => {
    try {
      showFeedback('Smart syncing PayHero transactions...', false);
      
      const response = await fetch('/api/sync/smart-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const result = await response.json();
      
      if (result.success) {
        const stats = result.stats || { updated: 0, created: 0, skipped: 0 };
        showFeedback(`Smart sync completed: ${stats.updated} updated, ${stats.created} created, ${stats.skipped} skipped`, false);
        // Refresh data to show updated payments
        fetchData();
      } else {
        showFeedback(`Smart sync failed: ${result.error || 'Unknown error'}`, true);
      }
    } catch (error: any) {
      console.error('Smart sync error:', error);
      showFeedback('Smart sync failed. Please try again.', true);
    }
  };

  // Helper function to determine payment type from notes
  const getPaymentTypeFromNotes = (notes: string | null) => {
    if (!notes) return 'Rent';
    if (notes.toLowerCase().includes('water')) return 'Rent + Water';
    if (notes.toLowerCase().includes('repair') || notes.toLowerCase().includes('service')) return 'Repairs';
    if (notes.toLowerCase().includes('plumbing')) return 'Plumbing';
    if (notes.toLowerCase().includes('electrical')) return 'Electrical';
    if (notes.toLowerCase().includes('painting')) return 'Painting';
    if (notes.toLowerCase().includes('carpentry')) return 'Carpentry';
    if (notes.toLowerCase().includes('security')) return 'Security';
    if (notes.toLowerCase().includes('delivery')) return 'Delivery';
    return 'Rent';
  };

  const formatMoney = (n: number) =>
    `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;

  const currentMonthPayments = payments.filter(
    (p) => p.payment_month === activeMonth,
  );

  // ── Stats ────────────────────────────────────────────
  const totalCollected = currentMonthPayments.reduce(
    (s, p) => s + Number(p.amount),
    0,
  );
  const paidTenantIds = new Set(currentMonthPayments.map((p) => p.tenant_id));
  const totalTenants = tenants.length;
  const paidCount = paidTenantIds.size;
  const unpaidCount = totalTenants - paidCount;

  // ── Tenant's own data ────────────────────────────────
  const myRentSetting = rentSettings.find((r) => r.tenant_id === user?.id);
  const myCurrentMonthPaid = payments.some(
    (p) => p.tenant_id === user?.id && p.payment_month === activeMonth,
  );
  const myCurrentPayment = payments.find(
    (p) => p.tenant_id === user?.id && p.payment_month === activeMonth,
  );

  const filteredPayments = currentMonthPayments.filter((p) => {
    if (!searchQuery) return true;
    const name = p.profiles?.full_name?.toLowerCase() || "";
    const code = p.mpesa_code?.toLowerCase() || "";
    return (
      name.includes(searchQuery.toLowerCase()) ||
      code.includes(searchQuery.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="p-5 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {role === "landlord" ? "Rent Ledger" : "My Payments"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {role === "landlord" ? (
                `${paidCount}/${totalTenants} tenants paid this month`
              ) : myCurrentMonthPaid ? (
                <span className="text-emerald-600 font-medium">
                  ✓ Paid this month
                </span>
              ) : (
                <span className="text-amber-600 font-medium">
                  ⏳ Payment due this month
                </span>
              )}
            </p>
          </div>
          {role === "landlord" && (
            <div className="flex gap-2">
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="border-border rounded-xl h-10 gap-2 text-sm hover:text-accent"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button
                onClick={smartSyncPayHero}
                variant="outline"
                className="border-border rounded-xl h-10 gap-2 text-sm hover:text-accent"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Smart Sync</span>
              </Button>
              <Button
                onClick={() => setShowSettingsForm(!showSettingsForm)}
                variant="outline"
                className="border-border rounded-xl h-10 gap-2 text-sm hover:text-accent"
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Set Rent</span>
              </Button>
              <Button
                onClick={() => setShowLogForm(!showLogForm)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-md shadow-accent/20 h-10 gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Log Payment</span>
              </Button>
            </div>
          )}
        </div>

        {/* ── Feedback ────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-destructive/8 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {success}
            </p>
          </div>
        )}

        {/* ── LANDLORD: Stats cards ────────────────────── */}
        {role === "landlord" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Collected",
                value: formatMoney(totalCollected),
                icon: <TrendingUp className="w-4 h-4" />,
                color: "text-emerald-600",
                bg: "bg-emerald-50 dark:bg-emerald-950/20",
              },
              {
                label: "Paid",
                value: `${paidCount} tenants`,
                icon: <CheckCircle2 className="w-4 h-4" />,
                color: "text-emerald-600",
                bg: "bg-emerald-50 dark:bg-emerald-950/20",
              },
              {
                label: "Pending",
                value: `${unpaidCount} tenants`,
                icon: <Clock className="w-4 h-4" />,
                color: "text-amber-600",
                bg: "bg-amber-50 dark:bg-amber-950/20",
              },
              {
                label: "Transactions",
                value: currentMonthPayments.length,
                icon: <Receipt className="w-4 h-4" />,
                color: "text-accent",
                bg: "bg-accent/5",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`${stat.bg} border border-border rounded-2xl p-4`}
              >
                <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                <p className="text-lg font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── TENANT: Payment status card ─────────────── */}
        {role === "tenant" && (
          <div
            className={`rounded-2xl border p-5 ${
              myCurrentMonthPaid
                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  myCurrentMonthPaid
                    ? "bg-emerald-100 dark:bg-emerald-900/40"
                    : "bg-amber-100 dark:bg-amber-900/40"
                }`}
              >
                {myCurrentMonthPaid ? (
                  <BadgeCheck className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-900" />
                )}
              </div>
              <div>
                <p
                  className={`font-bold text-base ${
                    myCurrentMonthPaid
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-900 dark:text-amber-900"
                  }`}
                >
                  {myCurrentMonthPaid ? "Rent Paid ✅" : "Rent Due ⏳"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {
                    MONTHS.find((m) => m.split("|")[1] === activeMonth)?.split(
                      "|",
                    )[0]
                  }
                </p>
              </div>
              {myRentSetting && (
                <div className="ml-auto text-right">
                  <p className="font-bold text-foreground">
                    {formatMoney(myRentSetting.monthly_amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">monthly rent</p>
                </div>
              )}
            </div>

            {myCurrentPayment && (
              <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3 space-y-1">
                {myCurrentPayment.mpesa_code && (
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs text-foreground">
                      M-Pesa Code:{" "}
                      <span className="font-bold font-mono">
                        {myCurrentPayment.mpesa_code}
                      </span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground">
                    Amount:{" "}
                    <span className="font-bold">
                      {formatMoney(Number(myCurrentPayment.amount))}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(myCurrentPayment.payment_date)}
                  </span>
                </div>
              </div>
            )}

            {!myCurrentMonthPaid && myRentSetting && (
              <>
                <div className="mt-3 p-3 bg-white/60 dark:bg-black/20 rounded-xl">
                  <p className="text-xs font-semibold text-foreground mb-2">
                    Enhanced Payment Options:
                  </p>
                  <div className="space-y-1">
                    {[
                      "💰 Rent + Water Bills + Repair Services",
                      "📱 Choose payment type in the modal",
                      "🔢 M-Pesa STK Push integration",
                      "✅ Automatic payment tracking",
                    ].map((s) => (
                      <p key={s} className="text-xs text-muted-foreground">
                        {s}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <PayButton
                    user={user}
                    amount={myRentSetting.monthly_amount}
                    month={activeMonth}
                    onSuccess={() => {
                      showFeedback("Enhanced payment initiated! Check your phone 📱")
                      fetchData() // Refresh payment data
                    }}
                    onError={(msg: string) => showFeedback(msg, true)}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Modal for phone number (STK Push) */}
        {showPayModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="font-bold mb-4">Enter M-Pesa Number</h3>
              <input
                type="tel"
                placeholder="e.g. 0712345678"
                value={payPhone}
                onChange={(e) => setPayPhone(e.target.value)}
                className="w-full rounded-xl border border-border p-3 mb-4 bg-secondary"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive"
                >
                  Cancel
                </Button>
                <Button
                  onClick={initiateSTKPush}
                  disabled={isPaying}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isPaying ? "Sending..." : "Pay"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Month selector ───────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {MONTHS.slice(0, 6).map((m) => {
            const [label, value] = m.split("|");
            return (
              <button
                key={value}
                onClick={() => setActiveMonth(value)}
                className={`text-xs px-3.5 py-2 rounded-xl border whitespace-nowrap transition-all shrink-0 font-medium ${
                  activeMonth === value
                    ? "bg-accent text-white border-accent shadow-sm shadow-accent/20"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── LANDLORD: Set Rent Settings Form ────────── */}
        {role === "landlord" && showSettingsForm && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">
                Set Tenant Rent Amount
              </h3>
              <button
                onClick={() => setShowSettingsForm(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRentSettings} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Tenant
                </label>
                <select
                  value={settingsTenantId}
                  onChange={(e) => {
                    setSettingsTenantId(e.target.value);
                    const existing = rentSettings.find(
                      (r) => r.tenant_id === e.target.value,
                    );
                    if (existing) {
                      setSettingsAmount(String(existing.monthly_amount));
                      setSettingsUnit(existing.unit_number || "");
                    } else {
                      setSettingsAmount("");
                      setSettingsUnit("");
                    }
                  }}
                  required
                  className="w-full rounded-xl border border-border bg-secondary text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Select tenant...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} — {t.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Monthly Rent (KES)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 18000"
                    value={settingsAmount}
                    onChange={(e) => setSettingsAmount(e.target.value)}
                    required
                    className="bg-secondary border-border text-foreground rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Unit / House No.
                  </label>
                  <Input
                    placeholder="e.g. A3, B12"
                    value={settingsUnit}
                    onChange={(e) => setSettingsUnit(e.target.value)}
                    className="bg-secondary border-border text-foreground rounded-xl h-11"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSettingsForm(false)}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingSettings}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-sm shadow-accent/20"
                >
                  {isSavingSettings ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── LANDLORD: Log Payment Form ───────────────── */}
        {role === "landlord" && showLogForm && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Log Payment Manually
                </h3>
              </div>
              <button
                onClick={() => setShowLogForm(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogPayment} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Tenant
                </label>
                <select
                  value={logTenantId}
                  onChange={(e) => {
                    setLogTenantId(e.target.value);
                    const rs = rentSettings.find(
                      (r) => r.tenant_id === e.target.value,
                    );
                    if (rs) setLogAmount(String(rs.monthly_amount));
                  }}
                  required
                  className="w-full rounded-xl border border-border bg-secondary text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Select tenant...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} — {t.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Amount (KES)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 18000"
                    value={logAmount}
                    onChange={(e) => setLogAmount(e.target.value)}
                    required
                    className="bg-secondary border-border text-foreground rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Payment Month
                  </label>
                  <select
                    value={logMonth}
                    onChange={(e) => setLogMonth(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 h-11"
                  >
                    {MONTHS.map((m) => {
                      const [label, value] = m.split("|");
                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "mpesa", label: "M-Pesa", icon: "📱" },
                    { value: "bank", label: "Bank Transfer", icon: "🏦" },
                    { value: "other", label: "Other", icon: "💵" },
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setLogMethod(m.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${
                        logMethod === m.value
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {logMethod === "mpesa" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      M-Pesa Code
                    </label>
                    <Input
                      placeholder="e.g. RGR000X1234"
                      value={logMpesaCode}
                      onChange={(e) =>
                        setLogMpesaCode(e.target.value.toUpperCase())
                      }
                      className="bg-secondary border-border text-foreground rounded-xl h-11 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Phone Number
                    </label>
                    <Input
                      placeholder="e.g. 0712345678"
                      value={logPhone}
                      onChange={(e) => setLogPhone(e.target.value)}
                      className="bg-secondary border-border text-foreground rounded-xl h-11"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Notes{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <Input
                  placeholder="e.g. Includes water bill, partial payment..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="bg-secondary border-border text-foreground rounded-xl h-11"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLogForm(false)}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLogging}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-sm shadow-accent/20"
                >
                  {isLogging ? "Logging..." : "Log Payment"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── LANDLORD: Tenant payment status grid ────── */}
        {role === "landlord" && tenants.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">
                Tenant Status —{" "}
                {
                  MONTHS.find((m) => m.split("|")[1] === activeMonth)?.split(
                    "|",
                  )[0]
                }
              </h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {
                    tenants.filter(
                      (t) =>
                        getTenantPaymentStatus(t.id, activeMonth).isComplete,
                    ).length
                  }{" "}
                  paid
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  {
                    tenants.filter(
                      (t) =>
                        getTenantPaymentStatus(t.id, activeMonth).isPartial,
                    ).length
                  }{" "}
                  partial
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  {
                    tenants.filter((t) => {
                      const s = getTenantPaymentStatus(t.id, activeMonth);
                      return !s.isComplete && !s.isPartial && !s.hasNoSetting;
                    }).length
                  }{" "}
                  unpaid
                </span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {tenants.map((tenant) => {
                const status = getTenantPaymentStatus(tenant.id, activeMonth);
                const rs = rentSettings.find((r) => r.tenant_id === tenant.id);
                const now = new Date();
                const day = parseInt(
                  now.toLocaleDateString("en-GB", {
                    day: "numeric",
                    timeZone: TZ,
                  }),
                );
                const isOverdue =
                  !status.isComplete && day > (rs?.due_day || 5);

                let badge = {
                  label: "PENDING",
                  style: "bg-amber-100 text-amber-700 border-amber-200",
                  dot: "bg-amber-400",
                };
                if (status.isComplete)
                  badge = {
                    label: "PAID",
                    style: "bg-emerald-100 text-emerald-700 border-emerald-200",
                    dot: "bg-emerald-500",
                  };
                else if (status.isPartial)
                  badge = {
                    label: "PARTIAL",
                    style: "bg-blue-100 text-blue-700 border-blue-200",
                    dot: "bg-blue-400",
                  };
                else if (isOverdue)
                  badge = {
                    label: "OVERDUE",
                    style: "bg-red-100 text-red-700 border-red-200",
                    dot: "bg-red-400",
                  };
                else if (status.hasNoSetting)
                  badge = {
                    label: "NOT SET",
                    style: "bg-secondary text-muted-foreground border-border",
                    dot: "bg-muted-foreground",
                  };

                return (
                  <div
                    key={tenant.id}
                    className="p-4 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden border border-accent/20">
                          {tenant.avatar_url ? (
                            <img
                              src={tenant.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-accent">
                              {tenant.full_name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${badge.dot}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {tenant.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {rs
                            ? `Unit ${rs.unit_number || "—"} · ${formatMoney(rs.monthly_amount)}/mo`
                            : "Rent not set"}
                        </p>
                        {status.payments[0]?.mpesa_code && (
                          <p className="text-[10px] font-mono text-accent mt-0.5">
                            {status.payments[0].mpesa_code}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.style}`}
                        >
                          {badge.label}
                        </span>
                        {status.totalPaid > 0 && (
                          <span className="text-xs font-bold text-foreground">
                            {formatMoney(status.totalPaid)}
                          </span>
                        )}
                        {status.isPartial && (
                          <span className="text-[10px] text-red-500 font-medium">
                            -{formatMoney(status.pending)} pending
                          </span>
                        )}
                        {!status.isComplete &&
                          !status.hasNoSetting &&
                          status.expected > 0 &&
                          status.totalPaid === 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatMoney(status.expected)} due
                            </span>
                          )}
                      </div>
                    </div>

                    {status.isPartial && status.expected > 0 && (
                      <div className="mt-3 ml-13">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">
                            Payment progress
                          </span>
                          <span className="text-[10px] font-medium text-foreground">
                            {Math.round(
                              (status.totalPaid / status.expected) * 100,
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (status.totalPaid / status.expected) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Enhanced Payment Table ──────────────────────── */}
        {role === "landlord" && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground">Payment Records</h3>
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    size="sm"
                    className="border-border rounded-xl h-8 gap-2 text-xs hover:text-accent"
                    disabled={filteredPayments.length === 0}
                  >
                    <Download className="w-3 h-3" />
                    Export CSV
                  </Button>
                </div>
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    placeholder="Search by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
                  />
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-2">
                  <p className="text-xs text-emerald-600 font-medium whitespace-nowrap">Rent</p>
                  <p className="text-sm font-bold text-emerald-700">
                    {formatMoney(
                      filteredPayments
                        .filter(p => !getPaymentTypeFromNotes(p.notes).includes('Water') && !getPaymentTypeFromNotes(p.notes).includes('Repair'))
                        .reduce((sum, p) => sum + p.amount, 0)
                    )}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-2">
                  <p className="text-xs text-blue-600 font-medium whitespace-nowrap">Water</p>
                  <p className="text-sm font-bold text-blue-700">
                    {formatMoney(
                      filteredPayments
                        .filter(p => getPaymentTypeFromNotes(p.notes).includes('Water'))
                        .reduce((sum, p) => sum + p.amount, 0)
                    )}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-2">
                  <p className="text-xs text-amber-600 font-medium whitespace-nowrap">Repairs</p>
                  <p className="text-sm font-bold text-amber-700">
                    {formatMoney(
                      filteredPayments
                        .filter(p => getPaymentTypeFromNotes(p.notes).includes('Repair') || getPaymentTypeFromNotes(p.notes).includes('Plumbing') || getPaymentTypeFromNotes(p.notes).includes('Electrical') || getPaymentTypeFromNotes(p.notes).includes('Painting') || getPaymentTypeFromNotes(p.notes).includes('Carpentry') || getPaymentTypeFromNotes(p.notes).includes('Security') || getPaymentTypeFromNotes(p.notes).includes('Delivery'))
                        .reduce((sum, p) => sum + p.amount, 0)
                    )}
                  </p>
                </div>
                <div className="bg-accent/5 rounded-xl p-2">
                  <p className="text-xs text-accent font-medium whitespace-nowrap">Total</p>
                  <p className="text-sm font-bold text-accent">
                    {formatMoney(
                      filteredPayments.reduce((sum, p) => sum + p.amount, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                  <Receipt className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <p className="font-semibold text-foreground">
                  No payments this month
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Log a payment above or wait for M-Pesa callback
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-secondary/50 border-b border-border sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Tenant</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Type</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">M-Pesa Code</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Date</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Method</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Notes</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPayments.map((payment) => {
                      const tenant = tenants.find(t => t.id === payment.tenant_id);
                      const paymentType = getPaymentTypeFromNotes(payment.notes);
                      const typeIcon = paymentType.includes('Water') ? <Droplets className="w-3 h-3 text-blue-500" /> : 
                                     paymentType.includes('Repair') || paymentType.includes('Plumbing') || paymentType.includes('Electrical') || paymentType.includes('Painting') || paymentType.includes('Carpentry') || paymentType.includes('Security') || paymentType.includes('Delivery') ? <Wrench className="w-3 h-3 text-amber-500" /> : 
                                     <Building2 className="w-3 h-3 text-emerald-500" />;
                      
                      return (
                        <tr key={payment.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                                {tenant?.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{tenant?.full_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground truncate">{tenant?.email || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {typeIcon}
                              <span className="text-xs font-medium text-foreground">{paymentType}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <span className="text-sm font-bold text-foreground">{formatMoney(payment.amount)}</span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {payment.mpesa_code ? (
                              <span className="text-xs font-mono text-accent bg-accent/5 px-2 py-1 rounded">
                                {payment.mpesa_code}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="text-xs text-muted-foreground">{formatDate(payment.payment_date)}</span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="text-xs px-2 py-1 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 border border-green-200 dark:border-green-800">
                              {payment.payment_method || 'M-Pesa'}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="text-xs text-muted-foreground max-w-40 truncate block" title={payment.notes || ''}>
                              {payment.notes || '-'}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePayment(payment.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TENANT: Payment History ───────────────────── */}
        {role === "tenant" && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden p-2">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Payment History</h3>
            </div>
            
            {filteredPayments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                  <Receipt className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <p className="font-semibold text-foreground">
                  No payments this month
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pay via M-Pesa Paybill 400200
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border m-2">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow m-2"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                          payment.payment_method === "mpesa"
                            ? "bg-green-50 dark:bg-green-950/20"
                            : "bg-blue-50 dark:bg-blue-950/20"
                        }`}
                      >
                        {payment.payment_method === "mpesa"
                          ? "📱"
                          : payment.payment_method === "bank"
                            ? "🏦"
                          : "💵"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-foreground">
                          {formatMoney(Number(payment.amount))}
                        </p>
                        {payment.mpesa_code && (
                          <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded-lg text-accent border border-accent/20">
                            {payment.mpesa_code}
                          </span>
                        )}
                        {payment.logged_by === "landlord" && (
                          <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full border border-border">
                            manual
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {payment.phone_number && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {payment.phone_number}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(payment.payment_date)}
                        </span>
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {payment.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        CONFIRMED
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* ── TENANT: Paybill info banner ──────────────── */}
        {role === "tenant" && (
          <div className="bg-card border border-accent/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground">Payment Details</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Paybill", value: "400200" },
                { label: "Account", value: "1060544" },
                { label: "Name", value: "LEA Properties Ltd" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-secondary rounded-xl p-3 text-center"
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                    {item.label}
                  </p>
                  <p className="text-sm font-bold text-foreground font-mono">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {[
                "✅ Pay between 1st and 5th of every month",
                "✅ Water bill must be paid together with rent",
                "❌ Cash and cheque payments not accepted",
                "📋 Always save your M-Pesa confirmation SMS",
                "⚠️ Late payments attract a 10% penalty",
              ].map((tip) => (
                <p key={tip} className="text-xs text-muted-foreground">
                  {tip}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
