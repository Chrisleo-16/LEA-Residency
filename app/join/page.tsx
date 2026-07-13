"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Home, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  getFriendlyAuthError,
  formatAuthErrorForDisplay,
} from "@/lib/auth-errors";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [landlordInfo, setLandlordInfo] = useState<{
    landlord_name: string;
    property_capacity: number;
    property_used: number;
  } | null>(null);
  const [blockError, setBlockError] = useState<string>("");
  const [isValidatingRef, setIsValidatingRef] = useState(false);

  // KEY FIX: mounted starts false on both server and client — identical initial render.
  // Nothing dynamic renders until after hydration completes.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // This runs only on the client, after hydration — safe to set state freely.
    setMounted(true);
    if (ref) {
      setIsValidatingRef(true);
      fetchLandlordInfo(ref);
    } else {
      setBlockError(
        "This invite link is missing a property reference. Please ask your landlord for a new link."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps intentional: ref from searchParams is stable on mount

  const fetchLandlordInfo = async (blockId: string) => {
    try {
      const { data, error: queryError } = await supabase
        .from("landlord_blocks")
        .select("landlord_name, property_capacity, property_used")
        .eq("id", blockId)
        .eq("is_active", true)
        .single();

      if (queryError || !data) {
        setBlockError(
          "This invite link is invalid or has expired. Please ask your landlord for a new one."
        );
        return;
      }

      if (data.property_used >= data.property_capacity) {
        setBlockError(
          "This property is full. No available slots. Contact your landlord."
        );
        return;
      }

      setLandlordInfo(data);
      setBlockError("");
    } catch (err) {
      // console.error("Failed to fetch landlord info:", err);
      setBlockError("Something went wrong validating this link. Please try again.");
    } finally {
      setIsValidatingRef(false);
    }
  };

  const handleSignup = async () => {
    if (!ref) {
      setError("Invalid invite link. Please ask your landlord for a new one.");
      return;
    }
    if (!landlordInfo) {
      setError("This invite link is invalid. Please ask your landlord for a new one.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: "tenant",
            landlord_block_id: ref,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        router.push("/dashboard");
      } else {
        setSuccessMessage(
          "Success! Please check your email inbox to confirm your account."
        );
      }
    } catch (err: any) {
      // console.error("Signup error:", err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!ref) {
      setError("Invalid invite link. Please ask your landlord for a new one.");
      return;
    }
    if (!landlordInfo) {
      setError("This invite link is invalid or the property is full.");
      return;
    }

    try {
      localStorage.setItem("landlord_block_id_to_link", ref);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?ref=${encodeURIComponent(ref)}`,
        },
      });

      if (oauthError) {
        const friendlyError = getFriendlyAuthError(
          oauthError.message || "Google sign-in failed"
        );
        setError(formatAuthErrorForDisplay(friendlyError));
      }
    } catch (err: any) {
      const friendlyError = getFriendlyAuthError(
        typeof err === "string" ? err : err?.message || "Unknown error"
      );
      setError(formatAuthErrorForDisplay(friendlyError));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSignup();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/building-facade.jpg')" }}
        />
        <div className="absolute inset-0 bg-linear-to-br from-black/80 via-black/60 to-black/40" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Home className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="text-white font-bold text-lg tracking-wide">
              LEA Executive
            </span>
          </div>
          <div>
            <div className="w-12 h-0.5 bg-accent mb-8" />
            {/* Static text on server, dynamic after mount — both render same initial HTML */}
            <h1 className="text-5xl font-bold text-white leading-tight mb-6">
              Join your property
            </h1>
            <p className="text-white/60 text-base max-w-sm leading-relaxed">
              Connect with your landlord, submit requests, and stay updated —
              all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12 lg:px-16">
        <div className="w-full max-w-105">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Home className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-foreground text-base">
              LEA Executive
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Create your account
            </h2>
            {/* Static subtitle always — avoids hydration mismatch from landlordInfo */}
            <p className="text-muted-foreground text-sm">
              Join your property on LEA
            </p>
          </div>

          {/*
            ALL dynamic content is gated behind `mounted`.
            Before mount: nothing renders here — server and client agree on the same empty shell.
            After mount: client renders whatever state it computed from useEffect.
          */}
          {mounted && (
            <>
              {/* Validating spinner */}
              {isValidatingRef && (
                <div className="mb-5 p-3.5 bg-secondary rounded-xl flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin shrink-0" />
                  <p className="text-sm text-muted-foreground">Validating invite link…</p>
                </div>
              )}

              {/* Block-level error (invalid link, full property) */}
              {!isValidatingRef && blockError && (
                <div className="mb-5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{blockError}</p>
                </div>
              )}

              {/* Success */}
              {successMessage && (
                <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {successMessage}
                  </p>
                </div>
              )}

              {/* Form-level errors */}
              {error && (
                <div className="mb-5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Form — only when block is valid */}
              {!isValidatingRef && !blockError && landlordInfo && (
                <>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        Full Name
                      </label>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading}
                        required
                        className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        Email address
                      </label>
                      <Input
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
                      <label className="text-sm font-medium text-foreground">
                        Password
                      </label>
                      <div className="relative">
                        <Input
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-xl flex items-center justify-center gap-2 mt-2"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                      ) : (
                        <>
                          Create Account
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
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-border bg-background hover:bg-secondary/50 transition-colors text-sm font-medium text-foreground"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </button>
                </>
              )}
            </>
          )}

          <div className="text-center mt-4">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowRight className="w-3 h-3 inline mr-1 rotate-180" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <JoinForm />
    </Suspense>
  );
}