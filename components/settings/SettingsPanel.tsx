"use client";

import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Moon,
  Sun,
  Lock,
  LogOut,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Eye,
  EyeOff,
  Trash2,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Shield,
  Fingerprint,
  AlertCircle,
  CheckCircle,
  Camera,
  User as UserIcon,
} from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import NotificationPermission from "@/components/notifications/NotificationPermission";

const TZ = "Africa/Nairobi";

interface SettingsPanelProps {
  user: User | null;
}

interface DeletionRequest {
  id: string;
  user_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles?: { full_name: string; email: string };
}

export default function SettingsPanel({ user }: SettingsPanelProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [myDeletionRequest, setMyDeletionRequest] =
    useState<DeletionRequest | null>(null);
  const [allDeletionRequests, setAllDeletionRequests] = useState<
    DeletionRequest[]
  >([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(
    null,
  );
  const [phoneNumber, setPhoneNumber] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const { subscribe, unsubscribe } = usePushNotifications();

  const handleToggleNotifications = async () => {
    if (notifications) {
      await unsubscribe();
      setNotifications(false);
      localStorage.setItem("notifications", "false");
    } else {
      const ok = await subscribe();
      setNotifications(ok);
      localStorage.setItem("notifications", String(ok));
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
    setNotifications(localStorage.getItem("notifications") === "true");

    // ✅ Hot reload — profile changes + deletion requests
    const channel = supabase
      .channel("settings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => {
          fetchProfile();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "account_deletion_requests",
        },
        () => {
          fetchProfile();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const fetchProfile = async () => {
    setIsLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, role, avatar_url, phone_number")
      .eq("id", user!.id)
      .single();

    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setRole(profile.role || "");
      setAvatarUrl(profile.avatar_url || null);
      setPhoneNumber(profile.phone_number || "");
      setAvatarUrl(profile.avatar_url || null);

      if (profile.role === "landlord") {
        const { data } = await supabase
          .from("account_deletion_requests")
          .select("*, profiles(full_name, email)")
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        setAllDeletionRequests(data || []);
      } else {
        const { data } = await supabase
          .from("account_deletion_requests")
          .select("*")
          .eq("user_id", user!.id)
          .maybeSingle();
        setMyDeletionRequest(data || null);
      }
    }
    setIsLoading(false);
  };

  const showFeedback = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => {
      setError("");
      setSuccess("");
    }, 4000);
  };

  const handleUpdateProfile = async () => {
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone_number: phoneNumber })
        .eq("id", user!.id);
      if (error) throw error;
      showFeedback("Profile updated successfully!");
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showFeedback("Passwords do not match.", true);
      return;
    }
    const strong = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!strong.test(newPassword)) {
      showFeedback(
        "Password must be 8+ characters with a number and special character.",
        true,
      );
      return;
    }
    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      showFeedback("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fileName = `${user!.id}-${Date.now()}`;
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path);
      await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user!.id);
      setAvatarUrl(urlData.publicUrl);
      showFeedback("Profile photo updated!");
    } catch (err: any) {
      showFeedback(err.message, true);
    }
  };

  const handleToggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleRequestDeletion = async () => {
    setIsSubmittingDelete(true);
    try {
      const { error } = await supabase
        .from("account_deletion_requests")
        .insert({
          user_id: user!.id,
          reason: deleteReason.trim(),
          status: "pending",
        });
      if (error) throw error;
      setShowDeleteModal(false);
      setDeleteReason("");
      showFeedback("Deletion request submitted. Your landlord will review it.");
      fetchProfile();
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!myDeletionRequest) return;
    await supabase
      .from("account_deletion_requests")
      .delete()
      .eq("id", myDeletionRequest.id);
    setMyDeletionRequest(null);
    showFeedback("Deletion request cancelled.");
  };

  const handleApproveAndDelete = async (
    requestId: string,
    targetUserId: string,
  ) => {
    try {
      await supabase
        .from("account_deletion_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id,
        })
        .eq("id", requestId);
      await supabase.from("message_reads").delete().eq("user_id", targetUserId);
      await supabase
        .from("message_reactions")
        .delete()
        .eq("user_id", targetUserId);
      await supabase.from("messages").delete().eq("sender_id", targetUserId);
      await supabase
        .from("conversation_participants")
        .delete()
        .eq("user_id", targetUserId);
      await supabase.from("complaints").delete().eq("tenant_id", targetUserId);
      await supabase.from("requests").delete().eq("tenant_id", targetUserId);
      await supabase
        .from("account_deletion_requests")
        .delete()
        .eq("user_id", targetUserId);
      await supabase.from("profiles").delete().eq("id", targetUserId);
      setShowConfirmDelete(null);
      showFeedback("Tenant account and all data removed successfully.");
      fetchProfile();
    } catch (err: any) {
      showFeedback(err.message, true);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    await supabase
      .from("account_deletion_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user!.id,
      })
      .eq("id", requestId);
    showFeedback("Request rejected.");
    fetchProfile();
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          label: "Pending Review",
          style:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400",
        };
      case "approved":
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: "Approved",
          style:
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400",
        };
      case "rejected":
        return {
          icon: <XCircle className="w-3.5 h-3.5" />,
          label: "Rejected",
          style:
            "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400",
        };
      default:
        return { icon: null, label: status, style: "" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const Section = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={`bg-card border border-border rounded-2xl p-5 ${className}`}
    >
      {children}
    </div>
  );

  const SectionHeader = ({
    icon,
    title,
  }: {
    icon: React.ReactNode;
    title: string;
  }) => (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="p-5 sm:p-8 space-y-4 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Feedback */}
        {error && (
          <div className="p-4 bg-destructive/8 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {success}
            </p>
          </div>
        )}

        {/* Profile card — avatar + name + role */}
        <Section>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 border-2 border-accent/20 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-accent">
                    {fullName.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-md hover:bg-accent/90 transition-colors"
              >
                <Camera className="w-3 h-3 text-white" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-lg truncate">
                {fullName || "No name set"}
              </p>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
              <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold bg-accent/10 text-accent px-2.5 py-1 rounded-full border border-accent/20 capitalize">
                <Shield className="w-3 h-3" />
                {role === "landlord" ? "Property Manager" : "Resident Tenant"}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 font-mono bg-secondary px-2 py-1 rounded-lg truncate">
            ID: {user?.id}
          </p>
        </Section>

        {/* Update name */}
        <Section>
          <SectionHeader
            icon={<UserIcon className="w-4 h-4 text-accent" />}
            title="Update Full Name"
          />
          <div className="space-y-3">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="bg-secondary border-border text-foreground rounded-xl h-11"
            />
            <Button
              onClick={handleUpdateProfile}
              disabled={isSavingProfile}
              className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl h-11 shadow-sm shadow-accent/20"
            >
              {isSavingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>
          {/* Phone Number */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              M-Pesa Phone Number
            </label>
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 0712345678"
              className="bg-secondary border-border text-foreground rounded-xl h-11"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must match the phone you use to pay M-Pesa rent
            </p>
          </div>
        </Section>

        {/* Change password */}
        <Section>
          <SectionHeader
            icon={<Lock className="w-4 h-4 text-accent" />}
            title="Change Password"
          />
          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="bg-secondary border-border text-foreground rounded-xl h-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="bg-secondary border-border text-foreground rounded-xl h-11"
            />
            <p className="text-xs text-muted-foreground">
              Min 8 characters with a number and special character
            </p>
            <Button
              onClick={handleChangePassword}
              disabled={isSavingPassword || !newPassword}
              className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl h-11 shadow-sm shadow-accent/20"
            >
              {isSavingPassword ? "Updating..." : "Change Password"}
            </Button>
          </div>
        </Section>

        {/* Preferences */}
        <Section>
          <SectionHeader
            icon={<Fingerprint className="w-4 h-4 text-accent" />}
            title="Preferences"
          />
          <div className="space-y-4">
            {/* Enhanced Notification Permission Component */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <Bell className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-medium text-foreground">Push Notifications</h3>
              </div>
              <div className="space-y-4">
                <NotificationPermission 
                  onPermissionGranted={() => {
                    setNotifications(true);
                    localStorage.setItem("notifications", "true");
                  }}
                  onPermissionDenied={() => {
                    setNotifications(false);
                    localStorage.setItem("notifications", "false");
                  }}
                  showInstructions={true}
                />
                
                              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-secondary rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  {isDark ? (
                    <Moon className="w-4 h-4 text-accent" />
                  ) : (
                    <Sun className="w-4 h-4 text-accent" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Toggle app appearance
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleTheme}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isDark ? "bg-accent" : "bg-border"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isDark ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>
        </Section>

        {/* LANDLORD: Deletion requests */}
        {role === "landlord" && allDeletionRequests.length > 0 && (
          <div className="bg-card border border-destructive/30 rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground">
                Account Deletion Requests
              </h3>
              <span className="ml-auto text-xs bg-destructive text-white px-2.5 py-0.5 rounded-full font-bold">
                {allDeletionRequests.length}
              </span>
            </div>
            <div className="space-y-3">
              {allDeletionRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-secondary rounded-xl border border-border space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0 border border-accent/20">
                        <span className="text-sm font-bold text-accent">
                          {req.profiles?.full_name?.charAt(0).toUpperCase() ||
                            "?"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {req.profiles?.full_name || "Unknown Tenant"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.profiles?.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(req.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: TZ,
                      })}
                    </span>
                  </div>

                  {req.reason && (
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          Reason:{" "}
                        </span>
                        {req.reason}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowConfirmDelete(req.id)}
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-9 text-xs rounded-xl gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Approve & Delete
                    </Button>
                    <Button
                      onClick={() => handleRejectRequest(req.id)}
                      variant="outline"
                      className="flex-1 border-border h-9 text-xs rounded-xl gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </Button>
                  </div>

                  {showConfirmDelete === req.id && (
                    <div className="bg-destructive/8 border border-destructive/25 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-destructive">
                        ⚠️ This action is irreversible
                      </p>
                      <p className="text-xs text-muted-foreground">
                        All data for{" "}
                        <span className="font-semibold text-foreground">
                          {req.profiles?.full_name}
                        </span>{" "}
                        will be permanently deleted including messages,
                        complaints, requests and profile.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            handleApproveAndDelete(req.id, req.user_id)
                          }
                          className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-9 text-xs rounded-xl"
                        >
                          Yes, Delete Everything
                        </Button>
                        <Button
                          onClick={() => setShowConfirmDelete(null)}
                          variant="outline"
                          className="flex-1 border-border h-9 text-xs rounded-xl"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TENANT: Delete account */}
        {role === "tenant" && (
          <div className="bg-card border border-destructive/25 rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground">Delete Account</h3>
            </div>

            {!myDeletionRequest ? (
              <>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Request your landlord to permanently delete your account and
                  all associated data.
                </p>
                <Button
                  onClick={() => setShowDeleteModal(true)}
                  variant="outline"
                  className="w-full border-destructive/50 text-destructive hover:bg-destructive/8 h-11 gap-2 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                  Request Account Deletion
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium ${getStatusConfig(myDeletionRequest.status).style}`}
                >
                  {getStatusConfig(myDeletionRequest.status).icon}
                  {getStatusConfig(myDeletionRequest.status).label}
                </div>
                {myDeletionRequest.status === "pending" && (
                  <p className="text-xs text-muted-foreground">
                    Your request is awaiting landlord review.
                  </p>
                )}
                {myDeletionRequest.status === "rejected" && (
                  <p className="text-xs text-muted-foreground">
                    Your deletion request was rejected. Contact your landlord
                    for more information.
                  </p>
                )}
                {myDeletionRequest.reason && (
                  <div className="text-xs text-muted-foreground bg-secondary rounded-xl p-3">
                    <span className="font-semibold">Your reason: </span>
                    {myDeletionRequest.reason}
                  </div>
                )}
                {myDeletionRequest.status === "pending" && (
                  <Button
                    onClick={handleCancelRequest}
                    variant="outline"
                    className="w-full border-border h-10 text-xs rounded-xl"
                  >
                    Cancel Request
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* Delete request modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-lg">
                Request Account Deletion
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReason("");
                }}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              This request will be sent to your landlord. Once approved, all
              your data will be permanently deleted.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Reason{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Moving out, no longer a tenant..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              </div>

              <div className="p-4 bg-destructive/8 border border-destructive/20 rounded-xl space-y-1">
                <p className="text-xs font-semibold text-destructive">
                  ⚠️ This will permanently delete:
                </p>
                <ul className="text-xs text-destructive/80 space-y-0.5 list-disc list-inside">
                  <li>All your messages and chat history</li>
                  <li>All your complaints and requests</li>
                  <li>Your profile and account data</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteReason("");
                  }}
                  className="flex-1 rounded-xl border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestDeletion}
                  disabled={isSubmittingDelete}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-xl"
                >
                  {isSubmittingDelete ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
