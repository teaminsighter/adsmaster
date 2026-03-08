'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';

interface Preferences {
  timezone: string;
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  showCents: boolean;
  defaultDateRange: string;
}

const defaultPreferences: Preferences = {
  timezone: 'America/Los_Angeles',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  theme: 'system',
  compactMode: false,
  showCents: true,
  defaultDateRange: '30d',
};

const timezones = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
const dateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
const dateRanges = [
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export default function PreferencesSettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <Header title="Preferences" />
      <div className="page-content">
        <div style={{ maxWidth: '600px' }}>
          {saved && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '24px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--success)',
              color: 'var(--success)',
            }}>
              Preferences saved successfully
            </div>
          )}

          {/* Regional Settings */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Regional Settings</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Timezone</label>
                <select
                  className="select"
                  value={prefs.timezone}
                  onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                  ))}
                </select>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  All dates and times will be displayed in this timezone
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Currency</label>
                <select
                  className="select"
                  value={prefs.currency}
                  onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {currencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Date Format</label>
                <select
                  className="select"
                  value={prefs.dateFormat}
                  onChange={(e) => setPrefs({ ...prefs, dateFormat: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {dateFormats.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Display Settings</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Theme</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {(['light', 'dark', 'system'] as const).map(theme => (
                    <button
                      key={theme}
                      className={`btn ${prefs.theme === theme ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPrefs({ ...prefs, theme })}
                      style={{ flex: 1, textTransform: 'capitalize' }}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Compact Mode</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Show more data in less space
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.compactMode}
                  onChange={(e) => setPrefs({ ...prefs, compactMode: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Show Cents</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Display currency values with decimal places
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.showCents}
                  onChange={(e) => setPrefs({ ...prefs, showCents: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Default Settings */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Default Settings</span>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Default Date Range</label>
              <select
                className="select"
                value={prefs.defaultDateRange}
                onChange={(e) => setPrefs({ ...prefs, defaultDateRange: e.target.value })}
                style={{ width: '100%' }}
              >
                {dateRanges.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                This date range will be used by default when viewing reports
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSave}>Save Preferences</button>
          </div>
        </div>
      </div>
    </>
  );
}
