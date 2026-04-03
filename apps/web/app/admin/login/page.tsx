'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Login failed');
      }

      const data = await response.json();

      // Store tokens
      localStorage.setItem('admin_token', data.access_token);
      localStorage.setItem('admin_refresh_token', data.refresh_token);
      localStorage.setItem('admin_user', JSON.stringify(data.admin));

      // Redirect to dashboard
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo-icon">A</span>
          </div>
          <h1 className="login-title">AdsMaster Admin</h1>
          <p className="login-subtitle">Sign in to access the admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@adsmaster.io"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <a href="/" className="back-link">← Back to App</a>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 24px;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 16px;
          margin-bottom: 20px;
        }

        .login-logo-icon {
          font-size: 32px;
          font-weight: 700;
          color: white;
        }

        .login-title {
          font-size: 24px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 8px 0;
        }

        .login-subtitle {
          font-size: 14px;
          color: #94a3b8;
          margin: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .login-error {
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

        .login-btn {
          padding: 14px 24px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .login-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 24px;
          text-align: center;
        }

        .back-link {
          color: #94a3b8;
          font-size: 14px;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .back-link:hover {
          color: #e2e8f0;
        }
      `}</style>
    </div>
  );
}
