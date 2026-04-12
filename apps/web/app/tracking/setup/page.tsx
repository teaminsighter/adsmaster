'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TrackingSetupPage() {
  const [orgId, setOrgId] = useState<string>('YOUR_ORG_ID');
  const [apiUrl, setApiUrl] = useState<string>('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    // Get actual org ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.org) {
          setOrgId(payload.org);
        }
      } catch (e) {
        console.error('Failed to parse token');
      }
    }

    // Get API URL
    setApiUrl(window.location.origin);
  }, []);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const trackingScript = `<!-- AdsMaster Tracking Script -->
<script>
  window.admasterConfig = {
    orgId: '${orgId}',
    apiUrl: '${apiUrl}'
  };
</script>
<script src="${apiUrl}/tracker.js" async></script>`;

  const conversionExample = `// Track a conversion when a user completes an action
window.admaster.trackConversion('purchase', 99.99, 'USD', {
  orderId: 'ORD-12345',
  product: 'Premium Plan'
});

// Or track a lead
window.admaster.trackConversion('lead', 0, 'USD', {
  formName: 'Contact Form'
});`;

  const identifyExample = `// Identify a visitor when they provide their info
window.admaster.identify({
  email: 'user@example.com',
  phone: '+1234567890',
  firstName: 'John',
  lastName: 'Doe'
});`;

  const trackEventExample = `// Track custom events
window.admaster.track('custom', 'button_click', {
  buttonId: 'signup-cta',
  page: '/pricing'
});`;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tracking Setup</h1>
          <p className="text-secondary">Install the tracking script on your website</p>
        </div>
      </div>

      {/* Installation Steps */}
      <div className="grid gap-6">
        {/* Step 1: Install Script */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                1
              </span>
              Install Tracking Script
            </h3>
          </div>
          <div className="card-body">
            <p className="mb-4">
              Add this code snippet to your website's <code>&lt;head&gt;</code> section:
            </p>
            <div className="relative">
              <pre className="p-4 rounded-lg overflow-x-auto text-sm" style={{ background: 'var(--bg-secondary)' }}>
                <code>{trackingScript}</code>
              </pre>
              <button
                className="btn btn-sm absolute top-2 right-2"
                onClick={() => copyToClipboard(trackingScript, 'script')}
              >
                {copied === 'script' ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-success-subtle)' }}>
              <div className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <div>
                  <div className="font-medium">What gets tracked automatically:</div>
                  <ul className="text-sm text-secondary mt-1 space-y-1">
                    <li>• Page views (including SPA navigation)</li>
                    <li>• Click IDs (GCLID, FBCLID, MSCLKID, etc.)</li>
                    <li>• UTM parameters</li>
                    <li>• Device, browser, and location info</li>
                    <li>• Form submissions (optional auto-capture)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Identify Users */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                2
              </span>
              Identify Visitors (Optional)
            </h3>
          </div>
          <div className="card-body">
            <p className="mb-4">
              When a visitor provides their contact info (e.g., fills a form), call <code>identify()</code>:
            </p>
            <div className="relative">
              <pre className="p-4 rounded-lg overflow-x-auto text-sm" style={{ background: 'var(--bg-secondary)' }}>
                <code>{identifyExample}</code>
              </pre>
              <button
                className="btn btn-sm absolute top-2 right-2"
                onClick={() => copyToClipboard(identifyExample, 'identify')}
              >
                {copied === 'identify' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: Track Conversions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                3
              </span>
              Track Conversions
            </h3>
          </div>
          <div className="card-body">
            <p className="mb-4">
              Track conversions to sync them to Meta CAPI and Google Ads:
            </p>
            <div className="relative">
              <pre className="p-4 rounded-lg overflow-x-auto text-sm" style={{ background: 'var(--bg-secondary)' }}>
                <code>{conversionExample}</code>
              </pre>
              <button
                className="btn btn-sm absolute top-2 right-2"
                onClick={() => copyToClipboard(conversionExample, 'conversion')}
              >
                {copied === 'conversion' ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="mt-4">
              <div className="font-medium mb-2">Supported conversion types:</div>
              <div className="flex flex-wrap gap-2">
                {['lead', 'purchase', 'signup', 'add_to_cart', 'initiate_checkout',
                  'complete_registration', 'subscribe', 'start_trial', 'contact',
                  'schedule', 'view_content', 'search'].map((type) => (
                  <span key={type} className="badge badge-outline">{type}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Custom Events */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                4
              </span>
              Track Custom Events (Optional)
            </h3>
          </div>
          <div className="card-body">
            <p className="mb-4">
              Track any custom event for analytics:
            </p>
            <div className="relative">
              <pre className="p-4 rounded-lg overflow-x-auto text-sm" style={{ background: 'var(--bg-secondary)' }}>
                <code>{trackEventExample}</code>
              </pre>
              <button
                className="btn btn-sm absolute top-2 right-2"
                onClick={() => copyToClipboard(trackEventExample, 'event')}
              >
                {copied === 'event' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Webhooks Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Webhook Integration</h3>
          </div>
          <div className="card-body">
            <p className="mb-4">
              Receive conversions from external systems like Zapier, Make, or your CRM.
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-dashed text-center">
                <div className="text-2xl mb-2">⚡</div>
                <div className="font-medium">Zapier</div>
                <div className="text-sm text-secondary">Send leads from any Zapier app</div>
              </div>
              <div className="p-4 rounded-lg border border-dashed text-center">
                <div className="text-2xl mb-2">🔄</div>
                <div className="font-medium">Make (Integromat)</div>
                <div className="text-sm text-secondary">Complex automation workflows</div>
              </div>
              <div className="p-4 rounded-lg border border-dashed text-center">
                <div className="text-2xl mb-2">📝</div>
                <div className="font-medium">Form Builders</div>
                <div className="text-sm text-secondary">Typeform, JotForm, etc.</div>
              </div>
            </div>

            <div className="mt-4">
              <Link href="/settings/webhooks" className="btn btn-secondary">
                Manage Webhooks
              </Link>
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Verify Installation</h3>
          </div>
          <div className="card-body">
            <p className="mb-4">
              After installing the script, verify it's working:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-secondary">
              <li>Open your website in a new browser tab</li>
              <li>Wait a few seconds for the page to load</li>
              <li>
                Come back here and check the{' '}
                <Link href="/tracking/visitors" className="text-primary">
                  Visitors page
                </Link>
              </li>
              <li>You should see your visit appear in the list</li>
            </ol>

            <div className="mt-4 flex gap-2">
              <Link href="/tracking/visitors" className="btn btn-primary">
                Check Visitors
              </Link>
              <a
                href={`${apiUrl}/health`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Test API Connection
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
