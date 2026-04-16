'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthFromOAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const data = searchParams.get('data');
        const redirect = searchParams.get('redirect') || '/dashboard';
        const errorParam = searchParams.get('error');
        const message = searchParams.get('message');

        if (errorParam) {
          setError(message || errorParam);
          return;
        }

        if (!data) {
          setError('No authentication data received');
          return;
        }

        // Decode base64 auth data
        const authData = JSON.parse(atob(data));

        if (!authData.access_token || !authData.user) {
          setError('Invalid authentication data');
          return;
        }

        // Store auth data using context method
        setAuthFromOAuth(authData);

        // Redirect to destination
        router.replace(redirect);
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Failed to process authentication');
      }
    };

    processCallback();
  }, [searchParams, router, setAuthFromOAuth]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="error-icon">!</div>
          <h2>Authentication Failed</h2>
          <p className="error-message">{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => router.push('/login')}
          >
            Back to Login
          </button>
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
            text-align: center;
            max-width: 400px;
            padding: 40px;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
          }
          .error-icon {
            width: 64px;
            height: 64px;
            background: rgba(239, 68, 68, 0.1);
            border: 2px solid #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 32px;
            font-weight: bold;
            color: #ef4444;
          }
          h2 {
            color: #f1f5f9;
            margin-bottom: 12px;
          }
          .error-message {
            color: #94a3b8;
            margin-bottom: 24px;
          }
          .btn {
            padding: 12px 24px;
            background: linear-gradient(135deg, #10b981, #059669);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
          }
          .btn:hover {
            opacity: 0.9;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="loading-card">
        <div className="spinner"></div>
        <p>Completing sign in...</p>
      </div>
      <style jsx>{`
        .auth-page {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          z-index: 100;
        }
        .loading-card {
          text-align: center;
        }
        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid #334155;
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        p {
          color: #94a3b8;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}

export default function AuthCallbackPage() {
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
        <div style={{ color: '#94a3b8', fontSize: '16px' }}>Processing...</div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
