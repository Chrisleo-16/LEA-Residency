"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Eye, EyeOff, ArrowRight, Home, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getFriendlyAuthError,
  formatAuthErrorForDisplay,
} from "@/lib/auth-errors";
import Link from "next/link";
import { useRouteLoader } from "@/components/RouteLoaderProvider";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";

  const [isLogin, setIsLogin] = useState(!isDemoMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(isDemoMode ? "tenant" : "landlord");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const {startLoading} = useRouteLoader();

  useEffect(() => {
    if (isDemoMode) return;

    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    const authMessage = params.get("message");

    if (authError === "auth_failed") {
      setError(
        decodeURIComponent(authMessage || "") ||
          "Authentication failed after redirect. Please try again or contact support.",
      );
    }

    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "role, kyc_verified, landlord_code, landlord_block_id, property_setup_complete",
        )
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
        return;
      }

      if (profile?.role === "developer") {
        router.push("/developer-dashboard");
        return;
      }

      const needsCompletion =
        profile?.role === "landlord" &&
        (!profile.landlord_code ||
          !profile.landlord_block_id ||
          !profile.property_setup_complete);

      if (needsCompletion) {
        router.push("/complete-setup");
      } else {
        router.push("/dashboard");
      }
    };

    checkSession();
  }, [router, supabase, isDemoMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;
      if (!data.user) throw new Error("Login failed");

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "role, kyc_verified, landlord_code, landlord_block_id, property_setup_complete",
        )
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.role === "developer") {
        router.push("/developer-dashboard");
      } else if (
        profile?.role === "landlord" &&
        (!profile.landlord_code ||
          !profile.landlord_block_id ||
          !profile.property_setup_complete)
      ) {
        router.push("/complete-setup");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      const friendlyError = getFriendlyAuthError(err.message || err);
      setError(formatAuthErrorForDisplay(friendlyError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name to start the demo.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/demo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start demo. Please try again.");
        setIsLoading(false);
        return;
      }

      router.push("/demo/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          role,
          propertyName: role === "landlord" ? name + "'s Property" : undefined,
          propertyAddress: role === "landlord" ? "To be updated" : undefined,
          totalUnits: role === "landlord" ? "1" : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;
      if (!signInData.user) throw new Error("Login after registration failed");

      if (role === "developer") {
        router.push("/developer-dashboard");
      } else if (role === "landlord") {
        router.push("/complete-setup");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      const friendlyError = getFriendlyAuthError(err.message || err);
      setError(formatAuthErrorForDisplay(friendlyError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        const friendlyError = getFriendlyAuthError(
          error.message || "Google sign-in failed",
        );
        setError(formatAuthErrorForDisplay(friendlyError));
      }
    } catch (err: any) {
      const friendlyError = getFriendlyAuthError(
        typeof err === "string" ? err : err?.message || "Unknown error",
      );
      setError(formatAuthErrorForDisplay(friendlyError));
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/lea-building.jpg')" }}
        />
        <div className="absolute inset-0 bg-linear-to-br from-black/80 via-black/60 to-black/40" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Link href="/" onClick={()=>{startLoading();}}>
                <Home className="w-5 h-5 text-accent-foreground" />
              </Link>
            </div>
            <span className="text-white font-bold text-lg tracking-wide">
              LEA Executive
            </span>
          </div>

          <div>
            <div className="w-12 h-0.5 bg-accent mb-8" />
            <h1 className="text-5xl font-bold text-white leading-tight mb-6">
              {isDemoMode ? (
                <>
                  Explore LEA
                  <br />
                  <span className="text-accent">risk-free.</span>
                </>
              ) : (
                <>
                  Your home,
                  <br />
                  <span className="text-accent">managed</span>
                  <br />
                  professionally.
                </>
              )}
            </h1>
            <p className="text-white/60 text-base max-w-sm leading-relaxed">
              {isDemoMode
                ? "See exactly how tenants and landlords use LEA — with sample data, no signup required."
                : "Connect with your landlord, submit requests, and stay updated — all in one place."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              "💬 Instant Messaging",
              "📋 Complaints & Requests",
              "📄 Policy Documents",
              "🔔 Push Notifications",
            ].map((item) => (
              <span
                key={item}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12 lg:px-16">
        <div className="w-full max-w-105">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Home className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-foreground text-base">
              LEA Executive
            </span>
          </div>

          {isDemoMode && (
            <div className="mb-6 p-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
              <p className="text-xs text-accent font-medium">
                Demo mode — no account needed
              </p>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {isDemoMode ? "Try the demo" : isLogin ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isDemoMode
                ? "Enter your name and pick a role to explore"
                : isLogin
                  ? "Sign in to access your LEA dashboard"
                  : "Join LEA Executive Residency today"}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm text-destructive whitespace-pre-line">
                {error}
              </div>
            </div>
          )}

          {isDemoMode ? (
            <form onSubmit={handleDemoSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="demo-name" className="text-sm font-medium text-foreground">
                  Your Name
                </label>
                <Input
                  id="demo-name"
                  type="text"
                  placeholder="e.g. Jane Wanjiru"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">I am a</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("tenant")}
                    className={`h-11 rounded-xl border text-sm font-medium transition-all ${
                      role === "tenant"
                        ? "border-accent bg-accent/10 text-accent shadow-sm"
                        : "border-border text-muted-foreground hover:border-accent/30"
                    }`}
                  >
                    Tenant
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("landlord")}
                    className={`h-11 rounded-xl border text-sm font-medium transition-all ${
                      role === "landlord"
                        ? "border-accent bg-accent/10 text-accent shadow-sm"
                        : "border-border text-muted-foreground hover:border-accent/30"
                    }`}
                  >
                    Landlord
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                onClick= {()=>{startLoading();}}
                className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-xl flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Launch Demo Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                No account created. Sample data only — nothing is saved.
              </p>

              <p className="text-center text-sm text-muted-foreground mt-4">
                Want the real thing?{" "}
                <Link href="/login" onClick={()=>{startLoading();}} className="text-accent font-semibold hover:underline">
                  Sign up instead
                </Link>
              </p>
            </form>
          ) : (
            <>
              <form
                onSubmit={isLogin ? handleLogin : handleRegister}
                className="space-y-4"
              >
                {!isLogin && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="full-name"
                      className="text-sm font-medium text-foreground"
                    >
                      Full Name
                    </label>
                    <Input
                      id="full-name"
                      name="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
                    />
                  </div>
                )}

                {!isLogin && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      I am a
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole("landlord")}
                        className="h-11 rounded-xl border text-sm font-medium transition-all border-accent bg-accent/10 text-accent shadow-sm cursor-default"
                      >
                        Landlord
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tenants join via a landlord referral link. Ask your landlord
                      for the link.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground"
                    >
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        className="text-xs text-accent hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11 bg-secondary/50 border-border text-foreground rounded-xl pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  onClick={()=>{startLoading();}}
                  className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-xl flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Sign In" : "Create Account"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">
                    or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={()=>{startLoading(); handleGoogleSignIn();}}
                disabled={isLoading}
                className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-border bg-background hover:bg-secondary/50 transition-colors text-sm font-medium text-foreground"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError("");
                    setRole(isLogin ? "landlord" : "tenant");
                  }}
                  className="text-accent font-semibold hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground mt-8">
            By continuing, you agree to LEA Executive's{" "}
            <span className="text-accent cursor-pointer hover:underline">
             <button onClick={() => {startLoading(); router.push('/terms')}}>Terms</button>
            </span>
            {" & "}
            <span className="text-accent cursor-pointer hover:underline">
             <button onClick={() => {startLoading(); router.push('/privacy')}}>Privacy Policy</button>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}