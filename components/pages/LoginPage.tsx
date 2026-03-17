'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AlertCircle, Eye, EyeOff, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data) router.push('/dashboard')
  }

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role } },
    })
    if (error) throw error
    if (data.session) {
      router.push('/dashboard')
    } else {
      throw new Error('Please check your email to confirm your account!')
    }
  }

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setError(error.message)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      if (isLogin) await handleLogin()
      else await handleSignup()
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      {/* Left branding panel — hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-accent flex-col items-center justify-center p-12 text-accent-foreground">
        <Building2 className="w-16 h-16 mb-6 opacity-90" />
        <h1 className="text-4xl font-bold mb-3">LEA Executive</h1>
        <p className="text-lg opacity-80 text-center max-w-xs">
          Residency & Apartments — Your home, managed professionally.
        </p>
        <div className="mt-12 space-y-4 w-full max-w-xs">
          {['Instant messaging with your landlord', 'Submit complaints & requests', 'Access policies & documents'].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm opacity-90">
              <div className="w-2 h-2 rounded-full bg-accent-foreground shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">

          {/* Mobile header */}
          <div className="text-center mb-8 md:hidden">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-accent" />
            <h1 className="text-2xl font-bold text-foreground">LEA Executive</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Residency & Apartments
            </p>
          </div>

          <Card className="p-6 sm:p-8 shadow-sm border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Full Name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    required
                    className="bg-input border-border text-foreground"
                  />
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">I am a</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['tenant', 'landlord'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2.5 px-4 rounded-md border text-sm font-medium capitalize transition-colors ${
                          role === r
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-foreground hover:bg-secondary'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="bg-input border-border text-foreground pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium h-11"
              >
                {isLoading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or continue with</span>
              </div>
            </div>

            {/* Google */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full border-border text-foreground hover:bg-secondary flex items-center justify-center gap-3 h-11"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="mt-5 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsLogin(!isLogin); setError('') }}
                className="w-full border-border text-foreground hover:bg-secondary h-11"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
