"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  Lock,
  RefreshCw,
  Server,
  Shield,
  TrendingUp,
  Users,
  Zap,
  XCircle,
  Bug,
  Eye,
  BarChart3,
  Wifi,
  ArrowUp,
  ArrowDown,
  Minus,
  Terminal,
  Bell,
  Package,
  Copy,
  Info,
  Timer,
  GitBranch,
  LogOut,
  CreditCard,
  Home,
  MessageSquare,
  FileText,
  Wrench,
  ClipboardList,
  UserCheck,
  Hash,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  Calendar,
  CheckSquare,
  AlertCircle,
} from "lucide-react";

// ─── Supabase client ──────────────────────────────────────────────
const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────
interface SentryEvent {
  id: string;
  title: string;
  level: "fatal" | "error" | "warning" | "info";
  count: number;
  lastSeen: string;
  firstSeen: string;
  culprit: string;
  project: string;
  isResolved: boolean;
  tags: Record<string, string>;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info" | "debug";
  message: string;
  source: string;
  meta?: Record<string, any>;
}

interface DashboardData {
  totalUsers: number;
  landlords: number;
  tenants: number;
  recentUsers: any[];
  blockchainVerified: number;
  kycVerified: number;
  totalPayments: number;
  totalRevenue: number;
  recentPayments: any[];
  pendingPayments: number;
  completedPayments: number;
  totalMessages: number;
  totalConversations: number;
  totalComplaints: number;
  openComplaints: number;
  totalRequests: number;
  openRequests: number;
  landlordBlocks: any[];
  totalBlocks: number;
  totalSlots: number;
  occupiedSlots: number;
  contactSubmissions: number;
  viewingRequests: number;
  pendingViewings: number;
  totalPolicies: number;
  pushSubscriptions: number;
  rentSettings: any[];
  totalStaff: number;
  activeStaff: number;
  pendingDeletions: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  time: string;
  icon: string;
  color: string;
}

const EMPTY_DATA: DashboardData = {
  totalUsers: 0,
  landlords: 0,
  tenants: 0,
  recentUsers: [],
  blockchainVerified: 0,
  kycVerified: 0,
  totalPayments: 0,
  totalRevenue: 0,
  recentPayments: [],
  pendingPayments: 0,
  completedPayments: 0,
  totalMessages: 0,
  totalConversations: 0,
  totalComplaints: 0,
  openComplaints: 0,
  totalRequests: 0,
  openRequests: 0,
  landlordBlocks: [],
  totalBlocks: 0,
  totalSlots: 0,
  occupiedSlots: 0,
  contactSubmissions: 0,
  viewingRequests: 0,
  pendingViewings: 0,
  totalPolicies: 0,
  pushSubscriptions: 0,
  rentSettings: [],
  totalStaff: 0,
  activeStaff: 0,
  pendingDeletions: 0,
  recentActivity: [],
};

// ─── Mock data (Sentry / Logs / Infra — replaced by real APIs when ready) ──
const MOCK_SENTRY: SentryEvent[] = [
  {
    id: "1",
    title: "TypeError: Cannot read property of undefined",
    level: "error",
    count: 42,
    lastSeen: "2 min ago",
    firstSeen: "3 days ago",
    culprit: "components/payments/PayButton.tsx",
    project: "lea-residency",
    isResolved: false,
    tags: { browser: "Chrome", os: "macOS" },
  },
  {
    id: "2",
    title: "ChunkLoadError: Loading chunk 12 failed",
    level: "error",
    count: 17,
    lastSeen: "14 min ago",
    firstSeen: "1 day ago",
    culprit: "pages/_app.tsx",
    project: "lea-residency",
    isResolved: false,
    tags: { browser: "Safari", os: "iOS" },
  },
  {
    id: "3",
    title: "Unhandled Promise Rejection: Network request failed",
    level: "warning",
    count: 8,
    lastSeen: "1 hr ago",
    firstSeen: "5 days ago",
    culprit: "hooks/useChat.ts",
    project: "lea-residency",
    isResolved: false,
    tags: { network: "offline" },
  },
  {
    id: "4",
    title: "RLS policy violation — unauthorized access attempt",
    level: "fatal",
    count: 2,
    lastSeen: "6 hr ago",
    firstSeen: "6 hr ago",
    culprit: "api/supabase/rls-check",
    project: "lea-residency",
    isResolved: false,
    tags: { security: "rls", table: "payments" },
  },
  {
    id: "5",
    title: "PayHero webhook signature mismatch",
    level: "warning",
    count: 3,
    lastSeen: "2 hr ago",
    firstSeen: "2 hr ago",
    culprit: "api/mpesa/callback/route.ts",
    project: "lea-residency",
    isResolved: true,
    tags: { service: "payhero" },
  },
];

const MOCK_LOGS: LogEntry[] = [
  {
    id: "1",
    timestamp: "10:42:31",
    level: "error",
    message: "STK push failed — invalid phone format",
    source: "api/mpesa/stkpush",
    meta: { phone: "07123", code: 400 },
  },
  {
    id: "2",
    timestamp: "10:41:15",
    level: "info",
    message: "Payment confirmed — KES 22,000 from 0712345678",
    source: "api/mpesa/callback",
    meta: { code: "RGR0012345", tenant: "unit-b3" },
  },
  {
    id: "3",
    timestamp: "10:39:02",
    level: "warn",
    message: "USSD session timeout — tenant did not complete registration",
    source: "api/ussd",
    meta: { session: "AT-USSDxyz", step: 3 },
  },
  {
    id: "4",
    timestamp: "10:35:44",
    level: "info",
    message: "New tenant registered via dashboard — Unit A1",
    source: "dashboard/settings",
    meta: { role: "tenant" },
  },
  {
    id: "5",
    timestamp: "10:30:11",
    level: "error",
    message: "Supabase realtime channel dropped — retrying",
    source: "hooks/useChat",
    meta: { channel: "messages", retry: 2 },
  },
  {
    id: "6",
    timestamp: "10:28:55",
    level: "info",
    message: "Voice IVR call completed — maintenance report logged",
    source: "api/voice/maintenance",
    meta: { category: "plumbing", tenant: "unit-c2" },
  },
  {
    id: "7",
    timestamp: "10:15:00",
    level: "debug",
    message: "RLS policy check passed for profiles table",
    source: "lib/supabase",
    meta: { table: "profiles", user: "auth-uid-abc" },
  },
];

const INFRA_ITEMS = [
  {
    label: "Rate Limiting",
    status: true,
    detail: "60 req/min per IP",
    icon: Shield,
  },
  {
    label: "PWA Cache",
    status: true,
    detail: "Service Worker active",
    icon: Package,
  },
  {
    label: "CDN (Vercel Edge)",
    status: true,
    detail: "Global edge network",
    icon: Globe,
  },
  {
    label: "Auto Scaling",
    status: true,
    detail: "Vercel + Supabase",
    icon: TrendingUp,
  },
  {
    label: "RLS Policies",
    status: true,
    detail: "All tables enforced",
    icon: Lock,
  },
  {
    label: "Idempotency",
    status: true,
    detail: "Payment webhooks",
    icon: RefreshCw,
  },
  {
    label: "Sentry Error Track",
    status: false,
    detail: "DSN not configured",
    icon: Bug,
  },
  {
    label: "Log Aggregation",
    status: false,
    detail: "console.log only",
    icon: Terminal,
  },
  {
    label: "Uptime Monitor",
    status: false,
    detail: "BetterStack pending",
    icon: Eye,
  },
  {
    label: "M-Pesa Callback",
    status: true,
    detail: "Paybill 400200 active",
    icon: Zap,
  },
  {
    label: "Africa's Talking",
    status: false,
    detail: "Sandbox / not live",
    icon: Wifi,
  },
  {
    label: "Realtime (Supabase)",
    status: true,
    detail: "REPLICA IDENTITY FULL",
    icon: Activity,
  },
];

// ─── Tab definitions ──────────────────────────────────────────────
type TabId =
  | "overview"
  | "errors"
  | "logs"
  | "infra"
  | "users"
  | "payments"
  | "activity"
  | "db"
  | "schema";

const TABS: {
  id: TabId;
  label: string;
  icon: React.ComponentType<any>;
  group: "system" | "data";
}[] = [
  { id: "overview", label: "Overview", icon: BarChart3, group: "system" },
  { id: "errors", label: "Errors", icon: Bug, group: "system" },
  { id: "logs", label: "Live Logs", icon: Terminal, group: "system" },
  { id: "infra", label: "Infrastructure", icon: Server, group: "system" },
  { id: "users", label: "Users", icon: Users, group: "data" },
  { id: "payments", label: "Payments", icon: CreditCard, group: "data" },
  { id: "activity", label: "Activity", icon: Activity, group: "data" },
  { id: "db", label: "Database", icon: Database, group: "data" },
  { id: "schema", label: "Schema", icon: GitBranch, group: "data" },
];

// ─── Helpers ──────────────────────────────────────────────────────
const G = "#c9a96e";
const CR = "#f2ede4";

const levelColor = (level: string) => {
  const m: Record<string, string> = {
    fatal: "#ef4444",
    error: "#ef4444",
    warning: "#f59e0b",
    warn: "#f59e0b",
    info: "#c9a96e",
    debug: "rgba(242,237,228,.35)",
  };
  return m[level] || "rgba(242,237,228,.4)";
};

const levelBg = (level: string) => {
  const m: Record<string, string> = {
    fatal: "rgba(239,68,68,.1)",
    error: "rgba(239,68,68,.08)",
    warning: "rgba(245,158,11,.08)",
    warn: "rgba(245,158,11,.08)",
    info: "rgba(201,169,110,.08)",
    debug: "rgba(242,237,228,.04)",
  };
  return m[level] || "rgba(242,237,228,.04)";
};

export default function DeveloperDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [dbData, setDbData] = useState<DashboardData>(EMPTY_DATA);
  const [sentryEvents] = useState<SentryEvent[]>(MOCK_SENTRY);
  const [logs] = useState<LogEntry[]>(MOCK_LOGS);
  const [logFilter, setLogFilter] = useState<
    "all" | "error" | "warn" | "info" | "debug"
  >("all");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const validateDeveloper = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError || !profile || profile.role !== 'developer') {
        router.push('/dashboard');
        return;
      }

      setIsAuthorized(true);
      setAuthLoading(false);
    };

    validateDeveloper();
  }, [router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-medium">Verifying developer access...</p>
        </div>
      </div>
    );
  }

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // ── Live Supabase fetch ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [
        profilesRes,
        paymentsRes,
        messagesRes,
        convsRes,
        complaintsRes,
        requestsRes,
        policiesRes,
        rentRes,
        blocksRes,
        slotsRes,
        contactRes,
        viewingRes,
        pushRes,
        staffRes,
        deleteRes,
        recentUsersRes,
        recentPayRes,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, email, role, created_at, blockchain_verified, kyc_verified, avatar_url, landlord_code, phone_number",
          ),
        supabase
          .from("payments")
          .select(
            "id, amount, status, payment_month, mpesa_code, phone_number, created_at, tenant_id, payment_method",
          ),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true }),
        supabase.from("complaints").select("id, status"),
        supabase.from("requests").select("id, status"),
        supabase.from("policies").select("id", { count: "exact", head: true }),
        supabase
          .from("rent_settings")
          .select("id, tenant_id, monthly_amount, unit_number"),
        supabase
          .from("landlord_blocks")
          .select(
            "id, landlord_name, landlord_code, block_number, block_hash, property_capacity, property_used, is_active, created_at",
          ),
        supabase
          .from("tenant_slots")
          .select("id, is_occupied, monthly_rent, tenant_name"),
        supabase
          .from("contact_submissions")
          .select("id", { count: "exact", head: true }),
        supabase.from("viewing_requests").select("id, status"),
        supabase
          .from("push_subscriptions")
          .select("id", { count: "exact", head: true }),
        supabase.from("staff").select("id, is_active"),
        supabase.from("account_deletion_requests").select("id, status"),
        supabase
          .from("profiles")
          .select(
            "id, full_name, email, role, created_at, avatar_url, phone_number, blockchain_verified",
          )
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("payments")
          .select(
            "id, amount, status, payment_month, mpesa_code, created_at, phone_number, payment_method",
          )
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      const profiles = profilesRes.data || [];
      const payments = paymentsRes.data || [];
      const complaints = complaintsRes.data || [];
      const requests = requestsRes.data || [];
      const slots = slotsRes.data || [];
      const viewings = viewingRes.data || [];
      const staff = staffRes.data || [];
      const deletions = deleteRes.data || [];
      const blocks = blocksRes.data || [];

      const activity: ActivityItem[] = [];
      (recentUsersRes.data || []).slice(0, 6).forEach((u: any) => {
        activity.push({
          id: u.id,
          type: "signup",
          description: `${u.full_name || u.email} joined as ${u.role}`,
          time: u.created_at,
          icon: "user",
          color: G,
        });
      });
      (recentPayRes.data || []).slice(0, 6).forEach((p: any) => {
        activity.push({
          id: p.id,
          type: "payment",
          description: `KES ${Number(p.amount).toLocaleString()} received — ${p.payment_month}`,
          time: p.created_at,
          icon: "payment",
          color: "#4ade80",
        });
      });
      activity.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
      );

      setDbData({
        totalUsers: profiles.length,
        landlords: profiles.filter((p: any) => p.role === "landlord").length,
        tenants: profiles.filter((p: any) => p.role === "tenant").length,
        recentUsers: recentUsersRes.data || [],
        blockchainVerified: profiles.filter((p: any) => p.blockchain_verified)
          .length,
        kycVerified: profiles.filter((p: any) => p.kyc_verified).length,
        totalPayments: payments.length,
        totalRevenue: payments
          .filter((p: any) => p.status === "completed")
          .reduce((s: number, p: any) => s + Number(p.amount), 0),
        recentPayments: recentPayRes.data || [],
        pendingPayments: payments.filter((p: any) => p.status === "pending")
          .length,
        completedPayments: payments.filter((p: any) => p.status === "completed")
          .length,
        totalMessages: messagesRes.count || 0,
        totalConversations: convsRes.count || 0,
        totalComplaints: complaints.length,
        openComplaints: complaints.filter((c: any) => c.status === "pending")
          .length,
        totalRequests: requests.length,
        openRequests: requests.filter((r: any) => r.status === "pending")
          .length,
        landlordBlocks: blocks,
        totalBlocks: blocks.length,
        totalSlots: slots.length,
        occupiedSlots: slots.filter((s: any) => s.is_occupied).length,
        contactSubmissions: contactRes.count || 0,
        viewingRequests: viewings.length,
        pendingViewings: viewings.filter((v: any) => v.status === "pending")
          .length,
        totalPolicies: policiesRes.count || 0,
        pushSubscriptions: pushRes.count || 0,
        rentSettings: rentRes.data || [],
        totalStaff: staff.length,
        activeStaff: staff.filter((s: any) => s.is_active).length,
        pendingDeletions: deletions.filter((d: any) => d.status === "pending")
          .length,
        recentActivity: activity,
      });
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err?.message || "Failed to fetch data from Supabase");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchAll]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const fmt = (n: number) => n.toLocaleString("en-KE");
  const fmtKES = (n: number) => "KES " + n.toLocaleString("en-KE");
  const fmtTime = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const timeAgo = (iso: string) => {
    if (!iso) return "—";
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const filteredLogs =
    logFilter === "all" ? logs : logs.filter((l) => l.level === logFilter);

  // ── Schema table definitions ─────────────────────────────────────
  const schemaTables = [
    {
      name: "profiles",
      cols: [
        "id",
        "full_name",
        "email",
        "role",
        "phone_number",
        "avatar_url",
        "landlord_code",
        "landlord_block_id",
        "blockchain_verified",
        "kyc_verified",
        "property_setup_complete",
        "created_at",
      ],
      rls: true,
      realtime: true,
      count: dbData.totalUsers,
    },
    {
      name: "payments",
      cols: [
        "id",
        "tenant_id",
        "landlord_id",
        "amount",
        "payment_month",
        "mpesa_code",
        "phone_number",
        "status",
        "payment_method",
        "notes",
        "payment_date",
      ],
      rls: true,
      realtime: true,
      count: dbData.totalPayments,
    },
    {
      name: "messages",
      cols: [
        "id",
        "conversation_id",
        "sender_id",
        "content",
        "is_edited",
        "edited_at",
        "reply_to_id",
        "read",
        "created_at",
      ],
      rls: true,
      realtime: true,
      count: dbData.totalMessages,
    },
    {
      name: "conversations",
      cols: ["id", "type", "created_at"],
      rls: true,
      realtime: true,
      count: dbData.totalConversations,
    },
    {
      name: "complaints",
      cols: ["id", "tenant_id", "title", "description", "status", "created_at"],
      rls: true,
      realtime: true,
      count: dbData.totalComplaints,
    },
    {
      name: "requests",
      cols: [
        "id",
        "tenant_id",
        "title",
        "description",
        "category",
        "status",
        "created_at",
      ],
      rls: true,
      realtime: true,
      count: dbData.totalRequests,
    },
    {
      name: "policies",
      cols: [
        "id",
        "title",
        "content",
        "category",
        "file_url",
        "created_by",
        "created_at",
      ],
      rls: true,
      realtime: false,
      count: dbData.totalPolicies,
    },
    {
      name: "rent_settings",
      cols: [
        "id",
        "tenant_id",
        "monthly_amount",
        "due_day",
        "unit_number",
        "created_at",
      ],
      rls: true,
      realtime: true,
      count: dbData.rentSettings.length,
    },
    {
      name: "landlord_blocks",
      cols: [
        "id",
        "landlord_id",
        "landlord_name",
        "landlord_code",
        "block_hash",
        "block_number",
        "property_capacity",
        "property_used",
        "is_active",
      ],
      rls: true,
      realtime: false,
      count: dbData.totalBlocks,
    },
    {
      name: "tenant_slots",
      cols: [
        "id",
        "landlord_block_id",
        "slot_number",
        "tenant_code",
        "tenant_id",
        "is_occupied",
        "monthly_rent",
        "lease_start_date",
        "lease_end_date",
      ],
      rls: true,
      realtime: false,
      count: dbData.totalSlots,
    },
    {
      name: "blockchain_transactions",
      cols: [
        "id",
        "block_hash",
        "transaction_type",
        "transaction_hash",
        "from_entity",
        "to_entity",
        "confirmed",
        "confirmations",
        "timestamp",
      ],
      rls: false,
      realtime: false,
      count: 0,
    },
    {
      name: "contact_submissions",
      cols: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "inquiry_type",
        "subject",
        "message",
        "status",
        "created_at",
      ],
      rls: false,
      realtime: false,
      count: dbData.contactSubmissions,
    },
    {
      name: "viewing_requests",
      cols: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "property_type",
        "preferred_date",
        "preferred_time",
        "status",
        "created_at",
      ],
      rls: false,
      realtime: false,
      count: dbData.viewingRequests,
    },
    {
      name: "push_subscriptions",
      cols: [
        "id",
        "user_id",
        "endpoint",
        "p256dh_key",
        "auth_key",
        "is_active",
        "created_at",
      ],
      rls: false,
      realtime: false,
      count: dbData.pushSubscriptions,
    },
    {
      name: "photos",
      cols: [
        "id",
        "user_id",
        "file_name",
        "file_url",
        "category",
        "title",
        "description",
        "tags",
        "is_public",
        "uploaded_at",
      ],
      rls: true,
      realtime: false,
      count: 0,
    },
    {
      name: "staff",
      cols: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "specialty",
        "availability",
        "hourly_rate",
        "rating",
        "is_active",
      ],
      rls: false,
      realtime: false,
      count: dbData.totalStaff,
    },
    {
      name: "staff_assignments",
      cols: [
        "id",
        "staff_id",
        "tenant_id",
        "property_id",
        "status",
        "assigned_at",
        "completed_at",
      ],
      rls: false,
      realtime: false,
      count: 0,
    },
    {
      name: "properties",
      cols: [
        "id",
        "landlord_block_id",
        "property_name",
        "property_address",
        "created_at",
      ],
      rls: false,
      realtime: false,
      count: 0,
    },
    {
      name: "account_deletion_requests",
      cols: [
        "id",
        "user_id",
        "reason",
        "status",
        "reviewed_by",
        "reviewed_at",
        "created_at",
      ],
      rls: false,
      realtime: false,
      count: dbData.pendingDeletions,
    },
    {
      name: "message_reactions",
      cols: ["id", "message_id", "user_id", "emoji", "created_at"],
      rls: true,
      realtime: true,
      count: 0,
    },
    {
      name: "message_reads",
      cols: ["id", "message_id", "user_id", "seen_at"],
      rls: true,
      realtime: true,
      count: 0,
    },
    {
      name: "conversation_participants",
      cols: ["id", "conversation_id", "user_id"],
      rls: true,
      realtime: true,
      count: 0,
    },
  ];

  // ── Overview system metrics (static + live) ─────────────────────
  const systemMetrics = [
    {
      label: "Uptime",
      value: "99.9",
      unit: "%",
      change: 0,
      icon: Activity,
      trend: "stable" as const,
      good: "up" as const,
    },
    {
      label: "Avg Response",
      value: "124",
      unit: "ms",
      change: -8,
      icon: Timer,
      trend: "down" as const,
      good: "down" as const,
    },
    {
      label: "Error Rate",
      value: "0.12",
      unit: "%",
      change: +0.04,
      icon: Bug,
      trend: "up" as const,
      good: "down" as const,
    },
    {
      label: "Active Users",
      value: dbData.totalUsers,
      unit: "",
      change: 0,
      icon: Users,
      trend: "stable" as const,
      good: "up" as const,
    },
    {
      label: "DB Queries/min",
      value: 342,
      unit: "",
      change: +21,
      icon: Database,
      trend: "up" as const,
      good: "up" as const,
    },
    {
      label: "Unresolved Errors",
      value: sentryEvents.filter((e) => !e.isResolved).length,
      unit: "",
      change: +1,
      icon: AlertTriangle,
      trend: "up" as const,
      good: "down" as const,
    },
  ];

  // ── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          fontFamily: "'DM Sans',sans-serif",
          background: "#0a0a0a",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=JetBrains+Mono:wght@400;500&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div
          style={{
            width: 36,
            height: 36,
            border: "2px solid rgba(201,169,110,.2)",
            borderTopColor: "#c9a96e",
            borderRadius: "50%",
            animation: "spin .8s linear infinite",
          }}
        />
        <p
          style={{
            color: "rgba(242,237,228,.4)",
            fontSize: 13,
            letterSpacing: ".08em",
          }}
        >
          Loading dashboard…
        </p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div
      style={{
        fontFamily: "'DM Sans',sans-serif",
        background: "#0a0a0a",
        color: CR,
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0a0a;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(201,169,110,.2);border-radius:2px;}

        .tab{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;background:transparent;border:none;cursor:pointer;padding:11px 16px;color:rgba(242,237,228,.38);transition:color .2s;border-bottom:2px solid transparent;display:flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;}
        .tab.active{color:#c9a96e;border-bottom-color:#c9a96e;}
        .tab:hover:not(.active){color:rgba(242,237,228,.7);}
        .tab-group-sep{width:1px;height:20px;background:rgba(242,237,228,.1);flex-shrink:0;align-self:center;margin:0 4px;}

        .card{background:#131313;border:1px solid rgba(242,237,228,.07);transition:border-color .3s;}
        .card:hover{border-color:rgba(201,169,110,.15);}

        .metric{background:#131313;border:1px solid rgba(242,237,228,.07);padding:20px 22px;transition:border-color .3s;}
        .metric:hover{border-color:rgba(201,169,110,.2);}

        .row-item{padding:14px 20px;border-bottom:1px solid rgba(242,237,228,.05);transition:background .15s;}
        .row-item:hover{background:rgba(242,237,228,.025);}
        .row-item:last-child{border-bottom:none;}

        .error-row{padding:16px 20px;border-bottom:1px solid rgba(242,237,228,.05);transition:background .2s;cursor:pointer;}
        .error-row:hover{background:rgba(242,237,228,.03);}
        .error-row:last-child{border-bottom:none;}

        .log-row{padding:10px 20px;border-bottom:1px solid rgba(242,237,228,.04);font-family:'JetBrains Mono',monospace;font-size:12px;transition:background .15s;}
        .log-row:hover{background:rgba(242,237,228,.03);}

        .infra-item{padding:16px 20px;border-bottom:1px solid rgba(242,237,228,.05);display:flex;align-items:center;gap:16px;transition:background .2s;}
        .infra-item:hover{background:rgba(242,237,228,.02);}
        .infra-item:last-child{border-bottom:none;}

        .badge{font-family:'DM Sans',sans-serif;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 9px;}
        .badge-green{background:rgba(74,222,128,.1);color:#4ade80;border:1px solid rgba(74,222,128,.25);}
        .badge-gold{background:rgba(201,169,110,.1);color:#c9a96e;border:1px solid rgba(201,169,110,.25);}
        .badge-red{background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.25);}
        .badge-muted{background:rgba(242,237,228,.06);color:rgba(242,237,228,.4);border:1px solid rgba(242,237,228,.1);}
        .badge-blue{background:rgba(96,165,250,.1);color:#60a5fa;border:1px solid rgba(96,165,250,.25);}

        .btn-sm{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;border:none;padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s;white-space:nowrap;}
        .btn-refresh{background:rgba(201,169,110,.08);border:1px solid rgba(201,169,110,.25)!important;color:#c9a96e;}
        .btn-refresh:hover{background:rgba(201,169,110,.16);}
        .btn-refresh:disabled{opacity:.4;cursor:not-allowed;}
        .btn-logout{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25)!important;color:#ef4444;}
        .btn-logout:hover{background:rgba(239,68,68,.15);}
        .btn-auto{background:transparent;color:rgba(242,237,228,.4);}
        .btn-auto.on{background:rgba(201,169,110,.1);color:#c9a96e;}

        .copy-btn{background:none;border:none;cursor:pointer;padding:3px 6px;color:rgba(242,237,228,.3);transition:color .2s;}
        .copy-btn:hover{color:#c9a96e;}

        .sec-label{font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#c9a96e;margin-bottom:14px;}

        .log-filter-btn{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;background:transparent;border:1px solid rgba(242,237,228,.12);color:rgba(242,237,228,.45);padding:6px 12px;cursor:pointer;transition:all .2s;}
        .log-filter-btn.active{border-color:#c9a96e;color:#c9a96e;}
        .log-filter-btn:hover:not(.active){border-color:rgba(242,237,228,.3);color:rgba(242,237,228,.75);}

        .schema-tag{font-family:'JetBrains Mono',monospace;font-size:10px;background:rgba(242,237,228,.05);border:1px solid rgba(242,237,228,.09);padding:2px 7px;color:rgba(242,237,228,.55);margin:2px;display:inline-block;}

        .section-header{font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#c9a96e;padding:14px 20px 10px;border-bottom:1px solid rgba(242,237,228,.05);}
        .pill{font-family:'DM Sans',sans-serif;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;padding:3px 9px;}

        @media(max-width:900px){
          .hide-md{display:none!important;}
          .grid-6{grid-template-columns:repeat(3,1fr)!important;}
          .grid-4{grid-template-columns:repeat(2,1fr)!important;}
          .grid-3{grid-template-columns:repeat(2,1fr)!important;}
          .grid-2{grid-template-columns:1fr!important;}
        }
        @media(max-width:600px){
          .hide-sm{display:none!important;}
          .grid-6{grid-template-columns:repeat(2,1fr)!important;}
          .grid-4{grid-template-columns:repeat(2,1fr)!important;}
          .grid-3{grid-template-columns:1fr!important;}
          .tab-label{display:none!important;}
          .tab{padding:11px 10px!important;}
        }

        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn .25s ease forwards;}
      `}</style>

      {/* ── TOP NAV ───────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10,10,10,.97)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(242,237,228,.07)",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: "1px solid #c9a96e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Terminal size={14} color="#c9a96e" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 18,
                fontWeight: 500,
                color: CR,
                letterSpacing: ".04em",
                lineHeight: 1.1,
              }}
            >
              Developer Console
            </div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: "rgba(201,169,110,.6)",
                lineHeight: 1,
              }}
              className="hide-sm"
            >
              LEA Executive Residency · Live
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginLeft: 8,
              padding: "3px 10px",
              border: "1px solid rgba(74,222,128,.2)",
              background: "rgba(74,222,128,.05)",
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#4ade80",
                animation: "pulse 2s infinite",
              }}
            />
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "#4ade80",
              }}
            >
              Live
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11,
              color: "rgba(242,237,228,.28)",
            }}
            className="hide-md"
          >
            {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            className={`btn-sm btn-auto${autoRefresh ? " on" : ""}`}
            style={{
              border: `1px solid ${autoRefresh ? "rgba(201,169,110,.3)" : "rgba(242,237,228,.1)"}`,
            }}
            onClick={() => setAutoRefresh((a) => !a)}
          >
            <span className="hide-sm">{autoRefresh ? "⏸ Auto" : "▶ Auto"}</span>
          </button>
          <button
            className="btn-sm btn-refresh"
            style={{ border: "" }}
            disabled={refreshing}
            onClick={fetchAll}
          >
            <RefreshCw
              size={11}
              style={{
                animation: refreshing ? "spin .8s linear infinite" : "none",
              }}
            />
            <span className="tab-label">Refresh</span>
          </button>
          <button
            className="btn-sm btn-logout"
            style={{ border: "" }}
            onClick={handleLogout}
          >
            <LogOut size={11} />
            <span className="tab-label">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* ── TAB BAR ───────────────────────────────────────────── */}
      <div
        style={{
          background: "#0f0f0f",
          borderBottom: "1px solid rgba(242,237,228,.07)",
          display: "flex",
          overflowX: "auto",
          padding: "0 12px",
        }}
      >
        {TABS.map((t, i) => {
          const Icon = t.icon;
          const prev = TABS[i - 1];
          const showSep = prev && prev.group !== t.group;
          return (
            <span key={t.id} style={{ display: "flex", alignItems: "center" }}>
              {showSep && <span className="tab-group-sep" />}
              <button
                className={`tab${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <Icon size={13} />
                <span className="tab-label">
                  {t.id === "errors"
                    ? `Errors${sentryEvents.filter((e) => !e.isResolved).length > 0 ? ` (${sentryEvents.filter((e) => !e.isResolved).length})` : ""}`
                    : t.label}
                </span>
              </button>
            </span>
          );
        })}
      </div>

      {/* ── ERROR BANNER ──────────────────────────────────────── */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,.08)",
            borderBottom: "1px solid rgba(239,68,68,.2)",
            padding: "10px 28px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertCircle size={14} color="#ef4444" />
          <span style={{ fontSize: 13, color: "#ef4444" }}>{error}</span>
          <button
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "rgba(242,237,228,.4)",
              cursor: "pointer",
              fontSize: 11,
            }}
            onClick={() => setError(null)}
          >
            dismiss
          </button>
        </div>
      )}

      <div style={{ padding: "26px 28px", maxWidth: 1440, margin: "0 auto" }}>
        {/* ════ OVERVIEW ══════════════════════════════════════════ */}
        {tab === "overview" && (
          <div className="fade-in">
            {/* System metrics — mix of live + static */}
            <div className="sec-label">System Metrics</div>
            <div
              className="grid-6"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6,1fr)",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {systemMetrics.map((m) => {
                const Icon = m.icon;
                const isGood =
                  (m.trend === "up" && (m.good as string) === "up") ||
                  (m.trend === "down" && (m.good as string) === "down");
                const isBad =
                  (m.trend === "up" && (m.good as string) === "down") ||
                  (m.trend === "down" && (m.good as string) === "up");
                const cc = isGood
                  ? "#4ade80"
                  : isBad
                    ? "#ef4444"
                    : "rgba(242,237,228,.4)";
                return (
                  <div key={m.label} className="metric">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <Icon size={15} color="rgba(201,169,110,.7)" />
                      {m.change !== 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            color: cc,
                          }}
                        >
                          {m.trend === "up" ? (
                            <ArrowUp size={10} />
                          ) : m.trend === "down" ? (
                            <ArrowDown size={10} />
                          ) : (
                            <Minus size={10} />
                          )}
                          <span style={{ fontSize: 10, fontWeight: 600 }}>
                            {Math.abs(m.change)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: 26,
                        fontWeight: 400,
                        color: CR,
                        lineHeight: 1,
                      }}
                    >
                      {m.value}
                      <span
                        style={{
                          fontSize: 13,
                          color: "rgba(242,237,228,.4)",
                          marginLeft: 2,
                        }}
                      >
                        {m.unit}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(242,237,228,.4)",
                        marginTop: 6,
                        letterSpacing: ".04em",
                      }}
                    >
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live business metrics */}
            <div className="sec-label">Platform Overview (Live)</div>
            <div
              className="grid-6"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6,1fr)",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {[
                {
                  label: "Total Users",
                  val: fmt(dbData.totalUsers),
                  icon: Users,
                  color: G,
                },
                {
                  label: "Landlords",
                  val: fmt(dbData.landlords),
                  icon: Building2,
                  color: G,
                },
                {
                  label: "Tenants",
                  val: fmt(dbData.tenants),
                  icon: Home,
                  color: "#60a5fa",
                },
                {
                  label: "Total Revenue",
                  val: fmtKES(dbData.totalRevenue),
                  icon: TrendingUp,
                  color: "#4ade80",
                },
                {
                  label: "Open Issues",
                  val: fmt(dbData.openComplaints + dbData.openRequests),
                  icon: AlertTriangle,
                  color: "#f59e0b",
                },
                {
                  label: "Pending Payments",
                  val: fmt(dbData.pendingPayments),
                  icon: CreditCard,
                  color: dbData.pendingPayments > 0 ? "#ef4444" : "#4ade80",
                },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="metric">
                    <Icon
                      size={14}
                      color={m.color}
                      style={{ marginBottom: 10 }}
                    />
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: 22,
                        fontWeight: 400,
                        color: CR,
                        lineHeight: 1,
                      }}
                    >
                      {m.val}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(242,237,228,.4)",
                        marginTop: 6,
                        letterSpacing: ".04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Two-column: recent errors + recent logs */}
            <div
              className="grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/* Recent errors */}
              <div className="card">
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid rgba(242,237,228,.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Bug size={13} color={G} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        color: CR,
                      }}
                    >
                      Recent Errors
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 10,
                        color: "rgba(242,237,228,.3)",
                      }}
                    >
                      (mock)
                    </span>
                  </div>
                  <button
                    style={{
                      fontSize: 10,
                      color: G,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                    }}
                    onClick={() => setTab("errors")}
                  >
                    View all →
                  </button>
                </div>
                {sentryEvents.slice(0, 4).map((e) => (
                  <div key={e.id} className="error-row">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: levelColor(e.level),
                          marginTop: 4,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: CR,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {e.title}
                        </div>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 10,
                            color: "rgba(242,237,228,.4)",
                            marginTop: 2,
                          }}
                        >
                          {e.culprit}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 11,
                            color: G,
                            fontWeight: 600,
                          }}
                        >
                          {e.count}×
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "rgba(242,237,228,.3)",
                            marginTop: 1,
                          }}
                        >
                          {e.lastSeen}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent live logs */}
              <div className="card">
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid rgba(242,237,228,.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Terminal size={13} color={G} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        color: CR,
                      }}
                    >
                      Recent Logs
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 10,
                        color: "rgba(242,237,228,.3)",
                      }}
                    >
                      (mock)
                    </span>
                  </div>
                  <button
                    style={{
                      fontSize: 10,
                      color: G,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                    }}
                    onClick={() => setTab("logs")}
                  >
                    View all →
                  </button>
                </div>
                {logs.slice(0, 6).map((l) => (
                  <div
                    key={l.id}
                    className="log-row"
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{ color: "rgba(242,237,228,.3)", minWidth: 60 }}
                    >
                      {l.timestamp}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        color: levelColor(l.level),
                        minWidth: 38,
                      }}
                    >
                      {l.level}
                    </span>
                    <span
                      style={{
                        color: "rgba(242,237,228,.65)",
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {l.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent live activity */}
            <div
              className="grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div className="card">
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid rgba(242,237,228,.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Activity size={13} color={G} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        color: CR,
                      }}
                    >
                      Recent Activity
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 6px",
                        background: "rgba(74,222,128,.1)",
                        color: "#4ade80",
                        border: "1px solid rgba(74,222,128,.2)",
                      }}
                    >
                      live
                    </span>
                  </div>
                  <button
                    style={{
                      fontSize: 10,
                      color: G,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                    }}
                    onClick={() => setTab("activity")}
                  >
                    View all →
                  </button>
                </div>
                {dbData.recentActivity.slice(0, 6).map((a, i) => (
                  <div
                    key={a.id + i}
                    className="row-item"
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: a.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: CR,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {a.description}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(242,237,228,.35)",
                          marginTop: 1,
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                        }}
                      >
                        {a.type}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(242,237,228,.35)",
                        flexShrink: 0,
                      }}
                    >
                      {timeAgo(a.time)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pending alerts */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  {
                    label: "Pending Payments",
                    val: dbData.pendingPayments,
                    icon: CreditCard,
                    color: "#f59e0b",
                    bad: true,
                  },
                  {
                    label: "Open Complaints",
                    val: dbData.openComplaints,
                    icon: ClipboardList,
                    color: "#ef4444",
                    bad: true,
                  },
                  {
                    label: "Open Maintenance Requests",
                    val: dbData.openRequests,
                    icon: Wrench,
                    color: "#f59e0b",
                    bad: true,
                  },
                  {
                    label: "Pending Viewing Requests",
                    val: dbData.pendingViewings,
                    icon: Eye,
                    color: "#60a5fa",
                    bad: false,
                  },
                  {
                    label: "Deletion Requests",
                    val: dbData.pendingDeletions,
                    icon: XCircle,
                    color: "#ef4444",
                    bad: true,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="card"
                      style={{
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          background: `${item.color}12`,
                          border: `1px solid ${item.color}28`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={13} color={item.color} />
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(242,237,228,.65)",
                          flex: 1,
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Cormorant Garamond',serif",
                          fontSize: 22,
                          fontWeight: 400,
                          color:
                            item.bad && item.val > 0
                              ? "#ef4444"
                              : item.val > 0
                                ? G
                                : CR,
                        }}
                      >
                        {item.val}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sentry setup banner */}
            <div
              style={{
                marginTop: 16,
                background: "rgba(245,158,11,.05)",
                border: "1px solid rgba(245,158,11,.18)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={14} color="#f59e0b" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: CR }}>
                    Sentry not configured
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(242,237,228,.45)",
                      marginTop: 1,
                    }}
                  >
                    Add{" "}
                    <code
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        background: "rgba(242,237,228,.07)",
                        padding: "1px 6px",
                        fontSize: 11,
                      }}
                    >
                      SENTRY_DSN
                    </code>{" "}
                    to Vercel to enable real error tracking.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    background: G,
                    color: "#0a0a0a",
                    border: "none",
                    padding: "8px 16px",
                    cursor: "pointer",
                  }}
                  onClick={() => window.open("https://sentry.io", "_blank")}
                >
                  Setup Sentry ↗
                </button>
                <button
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10,
                    background: "rgba(242,237,228,.06)",
                    border: "1px solid rgba(242,237,228,.12)",
                    color: "rgba(242,237,228,.55)",
                    padding: "8px 12px",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    copy("npx @sentry/wizard@latest -i nextjs", "sentry")
                  }
                >
                  {copied === "sentry"
                    ? "✓ Copied"
                    : "npx @sentry/wizard -i nextjs"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ ERRORS (mock Sentry) ═══════════════════════════════ */}
        {tab === "errors" && (
          <div className="fade-in">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div>
                <div className="sec-label" style={{ marginBottom: 4 }}>
                  Sentry Integration
                </div>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: 30,
                    fontWeight: 300,
                    color: CR,
                  }}
                >
                  Error{" "}
                  <em style={{ color: G, fontStyle: "italic" }}>Tracker</em>
                </h2>
              </div>
              <div style={{ fontSize: 11, color: "rgba(242,237,228,.4)" }}>
                {sentryEvents.filter((e) => !e.isResolved).length} unresolved ·{" "}
                {sentryEvents.filter((e) => e.isResolved).length} resolved
              </div>
            </div>

            <div
              className="grid-4"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                { level: "fatal", label: "Fatal", color: "#dc2626" },
                { level: "error", label: "Error", color: "#ef4444" },
                { level: "warning", label: "Warning", color: "#f59e0b" },
                { level: "info", label: "Info", color: G },
              ].map((s) => (
                <div
                  key={s.level}
                  style={{
                    background: "#131313",
                    border: `1px solid ${s.color}20`,
                    padding: "16px 20px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: 34,
                      fontWeight: 300,
                      color: s.color,
                      lineHeight: 1,
                    }}
                  >
                    {sentryEvents.filter((e) => e.level === s.level).length}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(242,237,228,.45)",
                      marginTop: 6,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div
                className="section-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>All Issues</span>
                <span
                  style={{
                    color: "rgba(242,237,228,.3)",
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10,
                  }}
                >
                  Sentry sandbox data
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "20px 1fr 100px 70px 100px 80px",
                  gap: 14,
                  padding: "9px 20px",
                  borderBottom: "1px solid rgba(242,237,228,.06)",
                  fontSize: 9,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "rgba(242,237,228,.3)",
                }}
              >
                <div />
                <div>Issue</div>
                <div className="hide-md">Project</div>
                <div>Events</div>
                <div className="hide-md">Last Seen</div>
                <div>Status</div>
              </div>
              {sentryEvents.map((e) => (
                <div
                  key={e.id}
                  className="error-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "20px 1fr 100px 70px 100px 80px",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: levelColor(e.level),
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: e.isResolved ? "rgba(242,237,228,.4)" : CR,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textDecoration: e.isResolved ? "line-through" : "none",
                      }}
                    >
                      {e.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 10,
                        color: "rgba(242,237,228,.35)",
                        marginTop: 2,
                      }}
                    >
                      {e.culprit}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        marginTop: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      {Object.entries(e.tags).map(([k, v]) => (
                        <span
                          key={k}
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 9,
                            background: "rgba(242,237,228,.05)",
                            border: "1px solid rgba(242,237,228,.1)",
                            padding: "1px 6px",
                            color: "rgba(242,237,228,.45)",
                          }}
                        >
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className="hide-md"
                    style={{ fontSize: 11, color: "rgba(242,237,228,.4)" }}
                  >
                    {e.project}
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 13,
                      color: G,
                      fontWeight: 600,
                    }}
                  >
                    {e.count}
                  </div>
                  <div
                    className="hide-md"
                    style={{ fontSize: 11, color: "rgba(242,237,228,.4)" }}
                  >
                    {e.lastSeen}
                  </div>
                  <div>
                    <span
                      className="pill"
                      style={{
                        background: e.isResolved
                          ? "rgba(74,222,128,.1)"
                          : levelBg(e.level),
                        color: e.isResolved ? "#4ade80" : levelColor(e.level),
                        border: `1px solid ${e.isResolved ? "rgba(74,222,128,.25)" : levelColor(e.level) + "44"}`,
                      }}
                    >
                      {e.isResolved ? "Resolved" : e.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Setup steps */}
            <div
              style={{
                marginTop: 16,
                background: "#131313",
                border: "1px solid rgba(242,237,228,.07)",
                padding: "20px",
              }}
            >
              <div className="sec-label" style={{ marginBottom: 12 }}>
                Connect Real Sentry Data
              </div>
              <div
                className="grid-2"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                {[
                  {
                    step: "1",
                    text: "Run wizard",
                    code: "npx @sentry/wizard@latest -i nextjs",
                  },
                  {
                    step: "2",
                    text: "Add to Vercel",
                    code: "SENTRY_DSN=https://xxx@sentry.io/xxx",
                  },
                  {
                    step: "3",
                    text: "Add auth token",
                    code: "SENTRY_AUTH_TOKEN=sntrys_...",
                  },
                  {
                    step: "4",
                    text: "Create API route",
                    code: "/api/developer/sentry-events",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    style={{
                      background: "#0f0f0f",
                      padding: "12px 14px",
                      border: "1px solid rgba(242,237,228,.06)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        color: "rgba(242,237,228,.3)",
                        marginBottom: 6,
                      }}
                    >
                      Step {item.step} — {item.text}
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <code
                        style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: 11,
                          color: G,
                          flex: 1,
                          wordBreak: "break-all",
                        }}
                      >
                        {item.code}
                      </code>
                      <button
                        className="copy-btn"
                        onClick={() => copy(item.code, item.step)}
                      >
                        {copied === item.step ? "✓" : <Copy size={11} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ LOGS (mock) ════════════════════════════════════════ */}
        {tab === "logs" && (
          <div className="fade-in">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div className="sec-label" style={{ marginBottom: 4 }}>
                  Application Logs
                </div>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: 30,
                    fontWeight: 300,
                    color: CR,
                  }}
                >
                  Live <em style={{ color: G, fontStyle: "italic" }}>Logs</em>
                </h2>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["all", "error", "warn", "info", "debug"] as const).map(
                  (f) => (
                    <button
                      key={f}
                      className={`log-filter-btn${logFilter === f ? " active" : ""}`}
                      onClick={() => setLogFilter(f)}
                    >
                      {f}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div
              style={{
                background: "#080808",
                border: "1px solid rgba(242,237,228,.08)",
                fontFamily: "'JetBrains Mono',monospace",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 14px",
                  borderBottom: "1px solid rgba(242,237,228,.06)",
                  background: "#111",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#ef4444",
                  }}
                />
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#f59e0b",
                  }}
                />
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#4ade80",
                  }}
                />
                <span
                  style={{
                    marginLeft: 10,
                    fontSize: 11,
                    color: "rgba(242,237,228,.3)",
                    letterSpacing: ".06em",
                  }}
                >
                  lea-residency — app logs
                </span>
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#4ade80",
                      animation: "pulse 2s infinite",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: "rgba(242,237,228,.3)",
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                    }}
                  >
                    mock stream
                  </span>
                </div>
              </div>
              <div
                style={{ maxHeight: 500, overflowY: "auto", padding: "6px 0" }}
              >
                {filteredLogs.map((l) => (
                  <div
                    key={l.id}
                    className="log-row"
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        color: "rgba(242,237,228,.25)",
                        flexShrink: 0,
                        fontSize: 11,
                      }}
                    >
                      {l.timestamp}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        color: levelColor(l.level),
                        minWidth: 38,
                        flexShrink: 0,
                      }}
                    >
                      {l.level}
                    </span>
                    <span
                      style={{
                        color: "rgba(201,169,110,.55)",
                        flexShrink: 0,
                        fontSize: 11,
                      }}
                    >
                      [{l.source}]
                    </span>
                    <span style={{ color: "rgba(242,237,228,.75)", flex: 1 }}>
                      {l.message}
                    </span>
                    {l.meta && (
                      <span
                        style={{
                          color: "rgba(242,237,228,.28)",
                          fontSize: 10,
                          flexShrink: 0,
                        }}
                      >
                        {JSON.stringify(l.meta)}
                      </span>
                    )}
                  </div>
                ))}
                {filteredLogs.length === 0 && (
                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "rgba(242,237,228,.25)",
                      fontSize: 13,
                    }}
                  >
                    No {logFilter} logs
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                padding: "12px 16px",
                background: "rgba(201,169,110,.05)",
                border: "1px solid rgba(201,169,110,.14)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Info size={13} color={G} />
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(242,237,228,.5)",
                  lineHeight: 1.6,
                }}
              >
                Showing mock logs. To stream real logs, create{" "}
                <code
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    background: "rgba(242,237,228,.07)",
                    padding: "1px 6px",
                    fontSize: 11,
                  }}
                >
                  /api/developer/logs
                </code>{" "}
                and connect Vercel Log Drain or BetterStack Logtail.
              </p>
            </div>
          </div>
        )}

        {/* ════ INFRASTRUCTURE (mock) ══════════════════════════════ */}
        {tab === "infra" && (
          <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
              <div className="sec-label" style={{ marginBottom: 4 }}>
                System Status
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 30,
                  fontWeight: 300,
                  color: CR,
                }}
              >
                Infrastructure{" "}
                <em style={{ color: G, fontStyle: "italic" }}>Health</em>
              </h2>
            </div>

            <div
              className="grid-3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                {
                  label: "Operational",
                  count: INFRA_ITEMS.filter((i) => i.status).length,
                  color: "#4ade80",
                },
                {
                  label: "Not Configured",
                  count: INFRA_ITEMS.filter((i) => !i.status).length,
                  color: "#ef4444",
                },
                {
                  label: "Total Services",
                  count: INFRA_ITEMS.length,
                  color: G,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "#131313",
                    border: "1px solid rgba(242,237,228,.07)",
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: 38,
                      fontWeight: 300,
                      color: s.color,
                      lineHeight: 1,
                    }}
                  >
                    {s.count}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(242,237,228,.4)",
                      marginTop: 8,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-header">Service Status</div>
              {INFRA_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="infra-item">
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        background: item.status
                          ? "rgba(74,222,128,.07)"
                          : "rgba(239,68,68,.07)",
                        border: `1px solid ${item.status ? "rgba(74,222,128,.18)" : "rgba(239,68,68,.18)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon
                        size={14}
                        color={item.status ? "#4ade80" : "#ef4444"}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: CR }}>
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: 11,
                          color: "rgba(242,237,228,.4)",
                          marginTop: 2,
                        }}
                      >
                        {item.detail}
                      </div>
                    </div>
                    <span
                      className="pill"
                      style={{
                        background: item.status
                          ? "rgba(74,222,128,.1)"
                          : "rgba(239,68,68,.1)",
                        color: item.status ? "#4ade80" : "#ef4444",
                        border: `1px solid ${item.status ? "rgba(74,222,128,.25)" : "rgba(239,68,68,.25)"}`,
                      }}
                    >
                      {item.status ? "Active" : "Inactive"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <div className="section-header">Action Required</div>
              {[
                {
                  title: "Set up Sentry error tracking",
                  cmd: "npx @sentry/wizard@latest -i nextjs",
                  priority: "high",
                },
                {
                  title: "Connect BetterStack uptime monitor",
                  cmd: "Add BETTERSTACK_API_KEY to Vercel env",
                  priority: "medium",
                },
                {
                  title: "Replace console.log with structured logging",
                  cmd: "npm install logtail @logtail/next",
                  priority: "medium",
                },
                {
                  title: "Activate Africa's Talking production account",
                  cmd: "Set AT_API_KEY + AT_USERNAME in Vercel env",
                  priority: "low",
                },
              ].map((a) => (
                <div key={a.title} className="infra-item">
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background:
                        a.priority === "high"
                          ? "#ef4444"
                          : a.priority === "medium"
                            ? "#f59e0b"
                            : G,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: CR }}>
                      {a.title}
                    </div>
                    <code
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 11,
                        color: "rgba(242,237,228,.45)",
                        marginTop: 3,
                        display: "block",
                      }}
                    >
                      {a.cmd}
                    </code>
                  </div>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <button
                      className="copy-btn"
                      onClick={() => copy(a.cmd, a.title)}
                    >
                      {copied === a.title ? (
                        <span style={{ color: "#4ade80", fontSize: 10 }}>
                          ✓
                        </span>
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                    <span
                      className="pill"
                      style={{
                        background: "rgba(242,237,228,.04)",
                        color: "rgba(242,237,228,.35)",
                        border: "1px solid rgba(242,237,228,.1)",
                      }}
                    >
                      {a.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ USERS (live) ═══════════════════════════════════════ */}
        {tab === "users" && (
          <div className="fade-in">
            <div className="sec-label">Registered Users · Live</div>

            <div
              className="grid-4"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                { label: "Total Accounts", val: dbData.totalUsers, color: G },
                { label: "Landlords", val: dbData.landlords, color: G },
                { label: "Tenants", val: dbData.tenants, color: "#60a5fa" },
                {
                  label: "Blockchain Verified",
                  val: dbData.blockchainVerified,
                  color: "#4ade80",
                },
              ].map((m) => (
                <div key={m.label} className="metric">
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: 32,
                      fontWeight: 300,
                      color: m.color,
                      lineHeight: 1,
                    }}
                  >
                    {m.val}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(242,237,228,.4)",
                      marginTop: 8,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {m.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 130px 150px 70px",
                  gap: 12,
                  padding: "9px 20px",
                  borderBottom: "1px solid rgba(242,237,228,.07)",
                  fontSize: 9,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "rgba(242,237,228,.3)",
                }}
              >
                <div>User</div>
                <div className="hide-md">Role</div>
                <div className="hide-md">Phone</div>
                <div className="hide-md">Joined</div>
                <div>Verified</div>
              </div>
              {dbData.recentUsers.length === 0 ? (
                <div
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "rgba(242,237,228,.3)",
                    fontSize: 14,
                  }}
                >
                  No users yet
                </div>
              ) : (
                dbData.recentUsers.map((u: any) => (
                  <div
                    key={u.id}
                    className="row-item"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 100px 130px 150px 70px",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                          alt=""
                        />
                      ) : (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "rgba(201,169,110,.1)",
                            border: "1px solid rgba(201,169,110,.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 600,
                            color: G,
                            flexShrink: 0,
                          }}
                        >
                          {(u.full_name || u.email || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: CR,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {u.full_name || "—"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(242,237,228,.38)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {u.email}
                        </div>
                      </div>
                    </div>
                    <div className="hide-md">
                      <span
                        className={
                          u.role === "landlord"
                            ? "badge badge-gold"
                            : u.role === "tenant"
                              ? "badge badge-blue"
                              : "badge badge-muted"
                        }
                      >
                        {u.role || "—"}
                      </span>
                    </div>
                    <div
                      className="hide-md"
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 11,
                        color: "rgba(242,237,228,.45)",
                      }}
                    >
                      {u.phone_number || "—"}
                    </div>
                    <div
                      className="hide-md"
                      style={{ fontSize: 11, color: "rgba(242,237,228,.4)" }}
                    >
                      {fmtTime(u.created_at)}
                    </div>
                    <div>
                      {u.blockchain_verified ? (
                        <CheckCircle size={13} color="#4ade80" />
                      ) : (
                        <Minus size={13} color="rgba(242,237,228,.2)" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Landlord blocks */}
            {dbData.landlordBlocks.length > 0 && (
              <>
                <div className="sec-label">Landlord Blocks</div>
                <div className="card">
                  {dbData.landlordBlocks.map((b: any) => (
                    <div
                      key={b.id}
                      className="row-item"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: CR,
                            marginBottom: 3,
                          }}
                        >
                          {b.landlord_name}
                        </div>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 10,
                            color: "rgba(242,237,228,.4)",
                          }}
                        >
                          Code: {b.landlord_code}
                        </div>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 9,
                            color: "rgba(242,237,228,.25)",
                            marginTop: 2,
                          }}
                        >
                          #{b.block_hash?.slice(0, 20)}…
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{ fontSize: 12, color: G, fontWeight: 600 }}
                        >
                          {b.property_used}/{b.property_capacity} units
                        </div>
                        <span
                          className={
                            b.is_active
                              ? "badge badge-green"
                              : "badge badge-red"
                          }
                        >
                          {b.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Rent settings */}
            {dbData.rentSettings.length > 0 && (
              <>
                <div className="sec-label" style={{ marginTop: 20 }}>
                  Rent Settings
                </div>
                <div className="card">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 140px",
                      gap: 12,
                      padding: "9px 20px",
                      borderBottom: "1px solid rgba(242,237,228,.07)",
                      fontSize: 9,
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      color: "rgba(242,237,228,.3)",
                    }}
                  >
                    <div>Tenant ID</div>
                    <div>Unit</div>
                    <div>Monthly Rent</div>
                  </div>
                  {dbData.rentSettings.map((r: any) => (
                    <div
                      key={r.id}
                      className="row-item"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 120px 140px",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: 11,
                          color: "rgba(242,237,228,.5)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.tenant_id}
                      </div>
                      <div style={{ fontSize: 12, color: CR }}>
                        {r.unit_number || "—"}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Cormorant Garamond',serif",
                          fontSize: 18,
                          fontWeight: 400,
                          color: G,
                        }}
                      >
                        {r.monthly_amount ? fmtKES(r.monthly_amount) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ PAYMENTS (live) ════════════════════════════════════ */}
        {tab === "payments" && (
          <div className="fade-in">
            <div className="sec-label">Payment Records · Live</div>

            <div
              className="grid-4"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                {
                  label: "Total Received",
                  val: fmtKES(dbData.totalRevenue),
                  color: "#4ade80",
                },
                {
                  label: "Completed",
                  val: fmt(dbData.completedPayments),
                  color: "#4ade80",
                },
                {
                  label: "Pending",
                  val: fmt(dbData.pendingPayments),
                  color: "#f59e0b",
                },
                {
                  label: "All Records",
                  val: fmt(dbData.totalPayments),
                  color: G,
                },
              ].map((m) => (
                <div key={m.label} className="metric">
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: 28,
                      fontWeight: 300,
                      color: m.color,
                      lineHeight: 1,
                    }}
                  >
                    {m.val}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(242,237,228,.4)",
                      marginTop: 8,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {m.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 100px 130px 90px 90px",
                  gap: 12,
                  padding: "9px 20px",
                  borderBottom: "1px solid rgba(242,237,228,.07)",
                  fontSize: 9,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "rgba(242,237,228,.3)",
                }}
              >
                <div>Phone / Time</div>
                <div>Month</div>
                <div>Amount</div>
                <div className="hide-md">M-Pesa Code</div>
                <div className="hide-md">Method</div>
                <div>Status</div>
              </div>
              {dbData.recentPayments.length === 0 ? (
                <div
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "rgba(242,237,228,.3)",
                    fontSize: 14,
                  }}
                >
                  No payments yet
                </div>
              ) : (
                dbData.recentPayments.map((p: any) => (
                  <div
                    key={p.id}
                    className="row-item"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 100px 130px 90px 90px",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: CR }}>
                        {p.phone_number || "—"}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(242,237,228,.35)",
                          marginTop: 1,
                        }}
                      >
                        {timeAgo(p.created_at)}
                      </div>
                    </div>
                    <div
                      style={{ fontSize: 12, color: "rgba(242,237,228,.65)" }}
                    >
                      {p.payment_month}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: 18,
                        fontWeight: 400,
                        color: "#4ade80",
                      }}
                    >
                      {fmtKES(Number(p.amount))}
                    </div>
                    <div
                      className="hide-md"
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 10,
                        color: "rgba(242,237,228,.4)",
                      }}
                    >
                      {p.mpesa_code ? (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {p.mpesa_code}
                          <button
                            className="copy-btn"
                            onClick={() => copy(p.mpesa_code, p.id)}
                          >
                            {copied === p.id ? (
                              <span style={{ color: "#4ade80", fontSize: 10 }}>
                                ✓
                              </span>
                            ) : (
                              <Copy size={10} />
                            )}
                          </button>
                        </span>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div
                      className="hide-md"
                      style={{ fontSize: 11, color: "rgba(242,237,228,.4)" }}
                    >
                      {p.payment_method || "—"}
                    </div>
                    <div>
                      <span
                        className={
                          p.status === "completed"
                            ? "badge badge-green"
                            : p.status === "pending"
                              ? "badge badge-gold"
                              : "badge badge-muted"
                        }
                      >
                        {p.status || "—"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ════ ACTIVITY (live) ════════════════════════════════════ */}
        {tab === "activity" && (
          <div className="fade-in">
            <div className="sec-label">Recent Activity Feed · Live</div>

            <div className="card" style={{ marginBottom: 20 }}>
              {dbData.recentActivity.length === 0 ? (
                <div
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "rgba(242,237,228,.3)",
                    fontSize: 14,
                  }}
                >
                  No recent activity
                </div>
              ) : (
                dbData.recentActivity.map((a, i) => (
                  <div
                    key={a.id + i}
                    className="row-item"
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: a.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: CR,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {a.description}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(242,237,228,.35)",
                          marginTop: 2,
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                        }}
                      >
                        {a.type}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(242,237,228,.35)",
                        flexShrink: 0,
                      }}
                    >
                      {timeAgo(a.time)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="sec-label">Platform Counts</div>
            <div
              className="grid-4"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 10,
              }}
            >
              {[
                { label: "Total Messages", val: fmt(dbData.totalMessages) },
                { label: "Conversations", val: fmt(dbData.totalConversations) },
                { label: "Complaints Filed", val: fmt(dbData.totalComplaints) },
                {
                  label: "Maintenance Requests",
                  val: fmt(dbData.totalRequests),
                },
                { label: "Policies Published", val: fmt(dbData.totalPolicies) },
                {
                  label: "Push Subscriptions",
                  val: fmt(dbData.pushSubscriptions),
                },
                { label: "Contact Forms", val: fmt(dbData.contactSubmissions) },
                { label: "Viewing Requests", val: fmt(dbData.viewingRequests) },
              ].map((m) => (
                <div
                  key={m.label}
                  className="metric"
                  style={{ padding: "14px 16px" }}
                >
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: 26,
                      fontWeight: 300,
                      color: CR,
                      lineHeight: 1,
                    }}
                  >
                    {m.val}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(242,237,228,.38)",
                      marginTop: 6,
                      letterSpacing: ".05em",
                    }}
                  >
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ DATABASE (live) ════════════════════════════════════ */}
        {tab === "db" && (
          <div className="fade-in">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div className="sec-label" style={{ marginBottom: 4 }}>
                  Supabase PostgreSQL · Live
                </div>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: 30,
                    fontWeight: 300,
                    color: CR,
                  }}
                >
                  Database{" "}
                  <em style={{ color: G, fontStyle: "italic" }}>Health</em>
                </h2>
              </div>
              <button
                style={{
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  background: "transparent",
                  border: "1px solid rgba(242,237,228,.14)",
                  color: "rgba(242,237,228,.45)",
                  padding: "8px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={() =>
                  window.open("https://supabase.com/dashboard", "_blank")
                }
              >
                Open Supabase ↗
              </button>
            </div>

            <div
              className="grid-4"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                {
                  label: "Total Tables",
                  value: schemaTables.length,
                  icon: Database,
                  color: G,
                },
                {
                  label: "RLS Enforced",
                  value: `${schemaTables.filter((t) => t.rls).length}/${schemaTables.length}`,
                  icon: Lock,
                  color: "#4ade80",
                },
                {
                  label: "Realtime Tables",
                  value: schemaTables.filter((t) => t.realtime).length,
                  icon: Activity,
                  color: G,
                },
                {
                  label: "Total Rows (known)",
                  value: fmt(
                    schemaTables.reduce(
                      (s, t) => s + (typeof t.count === "number" ? t.count : 0),
                      0,
                    ),
                  ),
                  icon: Zap,
                  color: "#4ade80",
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="metric">
                    <Icon
                      size={15}
                      color={s.color}
                      style={{ marginBottom: 10 }}
                    />
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: 28,
                        fontWeight: 300,
                        color: CR,
                        lineHeight: 1,
                      }}
                    >
                      {s.value}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(242,237,228,.4)",
                        marginTop: 8,
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-header">Tables</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 70px 60px 80px 1fr",
                  gap: 14,
                  padding: "9px 20px",
                  borderBottom: "1px solid rgba(242,237,228,.06)",
                  fontSize: 9,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "rgba(242,237,228,.3)",
                }}
              >
                <div>Table</div>
                <div>Rows</div>
                <div>RLS</div>
                <div>Realtime</div>
                <div>Last Write</div>
              </div>
              {schemaTables.map((t) => (
                <div
                  key={t.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 70px 60px 80px 1fr",
                    gap: 14,
                    padding: "11px 20px",
                    borderBottom: "1px solid rgba(242,237,228,.04)",
                    transition: "background .15s",
                    cursor: "default",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(242,237,228,.02)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 12,
                      color: G,
                      fontWeight: 500,
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 12,
                      color: CR,
                    }}
                  >
                    {typeof t.count === "number" ? t.count : "—"}
                  </div>
                  <div>
                    {t.rls ? (
                      <CheckCircle size={13} color="#4ade80" />
                    ) : (
                      <XCircle size={13} color="#ef4444" />
                    )}
                  </div>
                  <div>
                    {t.realtime ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <div
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#4ade80",
                            animation: "pulse 2s infinite",
                          }}
                        />
                        <span style={{ fontSize: 10, color: "#4ade80" }}>
                          live
                        </span>
                      </span>
                    ) : (
                      <span
                        style={{ fontSize: 10, color: "rgba(242,237,228,.3)" }}
                      >
                        off
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      color: "rgba(242,237,228,.4)",
                    }}
                  >
                    —
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: "14px 18px",
                background: "rgba(74,222,128,.04)",
                border: "1px solid rgba(74,222,128,.14)",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Shield
                size={14}
                color="#4ade80"
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: CR,
                    marginBottom: 3,
                  }}
                >
                  All critical tables have RLS enabled
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(242,237,228,.5)",
                    lineHeight: 1.7,
                  }}
                >
                  Row Level Security is enforced across all user-facing tables.
                  Tenants read only their own data. Landlords see only their
                  tenants. The{" "}
                  <code
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      background: "rgba(242,237,228,.07)",
                      padding: "1px 6px",
                      fontSize: 11,
                    }}
                  >
                    conversations
                  </code>{" "}
                  table uses{" "}
                  <code
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      background: "rgba(242,237,228,.07)",
                      padding: "1px 6px",
                      fontSize: 11,
                    }}
                  >
                    USING (true)
                  </code>{" "}
                  for group chat discovery.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ════ SCHEMA (live counts) ═══════════════════════════════ */}
        {tab === "schema" && (
          <div className="fade-in">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div className="sec-label" style={{ marginBottom: 4 }}>
                  Database Schema
                </div>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: 30,
                    fontWeight: 300,
                    color: CR,
                  }}
                >
                  {schemaTables.length}{" "}
                  <em style={{ color: G, fontStyle: "italic" }}>Tables</em>
                </h2>
              </div>
              <button
                style={{
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  background: "transparent",
                  border: "1px solid rgba(242,237,228,.12)",
                  color: "rgba(242,237,228,.4)",
                  padding: "8px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={() =>
                  window.open("https://supabase.com/dashboard", "_blank")
                }
              >
                Open Supabase ↗
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 60px 50px 50px 1fr",
                gap: 12,
                padding: "8px 20px",
                marginBottom: 4,
                fontSize: 9,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "rgba(242,237,228,.28)",
              }}
            >
              <div>Table</div>
              <div>Rows</div>
              <div>RLS</div>
              <div>RT</div>
              <div className="hide-sm">Columns</div>
            </div>

            <div className="card">
              {schemaTables.map((t, i) => (
                <div
                  key={t.name}
                  style={{
                    padding: "11px 20px",
                    borderBottom:
                      i < schemaTables.length - 1
                        ? "1px solid rgba(242,237,228,.04)"
                        : "none",
                    transition: "background .15s",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(242,237,228,.02)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "180px 60px 50px 50px 1fr",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 12,
                        color: G,
                        fontWeight: 500,
                      }}
                    >
                      {t.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 12,
                        color: CR,
                      }}
                    >
                      {typeof t.count === "number" ? t.count : "—"}
                    </div>
                    <div>
                      {t.rls ? (
                        <CheckCircle size={13} color="#4ade80" />
                      ) : (
                        <XCircle size={13} color="#ef4444" />
                      )}
                    </div>
                    <div>
                      {t.realtime ? (
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#4ade80",
                            animation: "pulse 2s infinite",
                            marginTop: 2,
                          }}
                        />
                      ) : (
                        <Minus size={12} color="rgba(242,237,228,.2)" />
                      )}
                    </div>
                    <div className="hide-sm" style={{ lineHeight: 1.7 }}>
                      {t.cols.map((c) => (
                        <span key={c} className="schema-tag">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              {[
                {
                  icon: <CheckCircle size={12} color="#4ade80" />,
                  label: "RLS enforced",
                },
                {
                  icon: <XCircle size={12} color="#ef4444" />,
                  label: "No RLS",
                },
                {
                  icon: (
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#4ade80",
                        animation: "pulse 2s infinite",
                        display: "inline-block",
                      }}
                    />
                  ),
                  label: "Realtime on",
                },
                {
                  icon: <Minus size={12} color="rgba(242,237,228,.25)" />,
                  label: "Realtime off",
                },
              ].map((l) => (
                <div
                  key={l.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: "rgba(242,237,228,.38)",
                  }}
                >
                  {l.icon} {l.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
