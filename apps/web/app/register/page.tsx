'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  // Check for OAuth errors
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const message = searchParams.get('message');
    if (errorParam) {
      setError(message || `Authentication failed: ${errorParam}`);
      router.replace('/register');
    }
  }, [searchParams, router]);

  // Google Sign Up handler
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      // New users from Google OAuth are automatically redirected to /connect
      const response = await fetch(`${API_URL}/auth/google/login?redirect_after=/connect`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to initiate Google sign up');
      }
      const data = await response.json();
      window.location.href = data.auth_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign up failed');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, fullName, organizationName || undefined);
      // Redirect to /connect is handled by the register function
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-loading">Loading...</div>
        <style jsx>{`
          .auth-page {
            position: fixed;
            inset: 0;
            display: flex;
            z-index: 100;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          }
          .auth-loading {
            color: #94a3b8;
            font-size: 16px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="auth-logo-icon">A</span>
          </div>
          <h1 className="auth-title">AdsMaster</h1>
          <p className="auth-subtitle">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              autoFocus
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="organization">
              Organization Name <span className="optional">(optional)</span>
            </label>
            <input
              id="organization"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Your company or agency"
              autoComplete="organization"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" fillRule="evenodd">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </g>
            </svg>
            {googleLoading ? 'Redirecting...' : 'Sign up with Google'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-switch">
            Already have an account?{' '}
            <Link href="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>

        <div className="terms-hint">
          <p>
            By creating an account, you agree to our{' '}
            <a href="/terms" className="terms-link">Terms of Service</a> and{' '}
            <a href="/privacy" className="terms-link">Privacy Policy</a>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 24px;
          z-index: 100;
        }

        .auth-card {
          width: 100%;
          max-width: 400px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .auth-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 16px;
          margin-bottom: 20px;
        }

        .auth-logo-icon {
          font-size: 32px;
          font-weight: 700;
          color: white;
        }

        .auth-title {
          font-size: 24px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 8px 0;
        }

        .auth-subtitle {
          font-size: 14px;
          color: #94a3b8;
          margin: 0;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .auth-error {
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #f87171;
          font-size: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #e2e8f0;
        }

        .optional {
          font-weight: 400;
          color: #64748b;
          font-size: 12px;
        }

        .form-group input {
          padding: 12px 16px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .form-group input:focus {
          border-color: #10b981;
        }

        .form-group input::placeholder {
          color: #64748b;
        }

        .auth-btn {
          padding: 14px 24px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.15s ease;
          margin-top: 8px;
        }

        .auth-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .auth-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #334155;
        }

        .auth-divider span {
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 24px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #1e293b;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
          margin-top: 16px;
        }

        .google-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .google-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-footer {
          margin-top: 24px;
          text-align: center;
        }

        .auth-switch {
          color: #94a3b8;
          font-size: 14px;
          margin: 0;
        }

        .auth-link {
          color: #10b981;
          text-decoration: none;
          font-weight: 500;
        }

        .auth-link:hover {
          text-decoration: underline;
        }

        .terms-hint {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #334155;
          text-align: center;
        }

        .terms-hint p {
          color: #64748b;
          font-size: 12px;
          margin: 0;
          line-height: 1.6;
        }

        .terms-link {
          color: #94a3b8;
          text-decoration: none;
        }

        .terms-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}>
        <div style={{ color: '#94a3b8', fontSize: '16px' }}>Loading...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
