'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Eye, EyeOff, ArrowRight, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link' 

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('tenant')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Redirect if already authenticated and profile setup is complete
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const authError = searchParams.get('error')
    const authMessage = searchParams.get('message')

    if (authError === 'auth_failed') {
      setError(
        authMessage ||
          'Authentication failed after redirect. Please try again or contact support.'
      )
    }

    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, kyc_verified, landlord_code, landlord_block_id, property_setup_complete')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Profile error:', profileError)
        return
      }

      if (profile?.role === 'developer') {
        router.push('/developer-dashboard')
        return
      }

      const needsCompletion =
        profile?.role === 'landlord' &&
        (!profile.landlord_code ||
          !profile.landlord_block_id ||
          !profile.property_setup_complete)

      if (needsCompletion) {
        router.push('/complete-setup')
      } else {
        router.push('/dashboard')
      }
    }

    checkSession()
  }, [router, supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError
      if (!data.user) throw new Error('Login failed')

      // Get user role and profile completion state
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, kyc_verified, landlord_code, landlord_block_id, property_setup_complete')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile?.role === 'developer') {
        router.push('/developer-dashboard')
      } else if (
        profile?.role === 'landlord' &&
        (!profile.landlord_code ||
          !profile.landlord_block_id ||
          !profile.property_setup_complete)
      ) {
        router.push('/complete-setup')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          role,
          propertyName: role === 'landlord' ? name + "'s Property" : undefined,
          propertyAddress: role === 'landlord' ? 'To be updated' : undefined,
          totalUnits: role === 'landlord' ? '1' : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Sign in after successful registration
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError
      if (!signInData.user) throw new Error('Login after registration failed')

      // Redirect based on role and profile completion
      if (role === 'developer') {
        router.push('/developer-dashboard')
      } else if (role === 'landlord') {
        router.push('/complete-setup')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) setError(error.message)
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed')
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left Panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">

        {/* Background image — place your image at public/images/lea-building.jpg */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/lea-building.jpg')" }}
        />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-br from-black/80 via-black/60 to-black/40" />

        {/* Teal accent overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">

          {/* Top — Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Link href="/">
              <Home className="w-5 h-5 text-accent-foreground" />
              </Link>
            </div>
            <span className="text-white font-bold text-lg tracking-wide">
              LEA Executive
            </span>
          </div>

          {/* Middle — Big quote */}
          <div>
            <div className="w-12 h-0.5 bg-accent mb-8" />
            <h1 className="text-5xl font-bold text-white leading-tight mb-6">
              Your home,<br />
              <span className="text-accent">managed</span><br />
              professionally.
            </h1>
            <p className="text-white/60 text-base max-w-sm leading-relaxed">
              Connect with your landlord, submit requests, and stay updated — all in one place.
            </p>
          </div>

          {/* Bottom — Feature pills */}
          <div className="flex flex-wrap gap-3">
            {[
              '💬 Instant Messaging',
              '📋 Complaints & Requests',
              '📄 Policy Documents',
              '🔔 Push Notifications',
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

      {/* ── Right Panel ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12 lg:px-16">
        <div className="w-full max-w-105">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Home className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-foreground text-base">LEA Executive</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isLogin
                ? 'Sign in to access your LEA dashboard'
                : 'Join LEA Executive Residency today'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">

            {/* Full name — signup only */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label htmlFor="full-name" className="text-sm font-medium text-foreground">Full Name</label>
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

            {/* Role selector — signup only */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">I am a</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'tenant', label: '🏠 Tenant' },
                    { value: 'landlord', label: '🏢 Landlord' },
                  ].map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`h-11 rounded-xl border text-sm font-medium transition-all ${
                        role === r.value
                          ? 'border-accent bg-accent/10 text-accent shadow-sm'
                          : 'border-border text-muted-foreground hover:border-accent/50 hover:text-foreground'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email address</label>
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

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
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
                  type={showPassword ? 'text' : 'password'}
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
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-xl flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-border bg-background hover:bg-secondary/50 transition-colors text-sm font-medium text-foreground"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Toggle */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError('') }}
              className="text-accent font-semibold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            By continuing, you agree to LEA Executive's{' '}
            <span className="text-accent cursor-pointer hover:underline">Terms</span>
            {' & '}
            <span className="text-accent cursor-pointer hover:underline">Privacy Policy</span>
          </p>
        </div>
      </div>

      {/* Property Setup removed; registration endpoint handles property setup for landlords. */}
    </div>
  )
}

// **Option 1 — Use a free property photo:**
// ```
// Download from: https://unsplash.com/s/photos/apartment-building
// Save as: public/images/lea-building.jpg