'use client';

import Header from '@/components/layout/Header';
import { formatMicros } from '@/lib/api';

const mockClients = [
  {
    id: '1',
    name: 'Acme Corp',
    email: 'marketing@acme.com',
    status: 'ACTIVE',
    accounts: 3,
    spend: 45678_000000,
    roas: 4.2,
    healthScore: 85,
    lastActivity: '2 hours ago',
  },
  {
    id: '2',
    name: 'TechStart Inc',
    email: 'ads@techstart.io',
    status: 'ACTIVE',
    accounts: 2,
    spend: 28900_000000,
    roas: 3.8,
    healthScore: 72,
    lastActivity: '5 hours ago',
  },
  {
    id: '3',
    name: 'Fashion Hub',
    email: 'growth@fashionhub.com',
    status: 'ACTIVE',
    accounts: 4,
    spend: 67500_000000,
    roas: 5.1,
    healthScore: 91,
    lastActivity: '1 hour ago',
  },
  {
    id: '4',
    name: 'Local Eats',
    email: 'owner@localeats.com',
    status: 'PAUSED',
    accounts: 1,
    spend: 5400_000000,
    roas: 2.4,
    healthScore: 45,
    lastActivity: '3 days ago',
  },
  {
    id: '5',
    name: 'Sports Gear Pro',
    email: 'digital@sportsgear.com',
    status: 'ACTIVE',
    accounts: 2,
    spend: 34200_000000,
    roas: 4.5,
    healthScore: 78,
    lastActivity: '30 minutes ago',
  },
];

export default function ClientsPage() {
  const stats = {
    total: mockClients.length,
    active: mockClients.filter((c) => c.status === 'ACTIVE').length,
    totalSpend: mockClients.reduce((sum, c) => sum + c.spend, 0),
    avgHealth: Math.round(mockClients.reduce((sum, c) => sum + c.healthScore, 0) / mockClients.length),
  };

  return (
    <>
      <Header title="Clients" />
      <div className="page-content">
        {/* Stats */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Clients</div>
            <div className="metric-value">{stats.total}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {stats.active} active
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Managed Spend</div>
            <div className="metric-value mono">{formatMicros(stats.totalSpend)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg Health Score</div>
            <div className="metric-value">{stats.avgHealth}%</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Accounts</div>
            <div className="metric-value">{mockClients.reduce((sum, c) => sum + c.accounts, 0)}</div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="input"
                placeholder="Search clients..."
                style={{ width: '250px' }}
              />
              <select className="select">
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>
            <button className="btn btn-primary btn-sm">+ Add Client</button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Status</th>
                <th className="center">Accounts</th>
                <th className="right">Spend (30d)</th>
                <th className="right">ROAS</th>
                <th className="center">Health</th>
                <th>Last Activity</th>
                <th style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {mockClients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 500 }}>{client.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{client.email}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${client.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                      {client.status === 'ACTIVE' ? '● Active' : '○ Paused'}
                    </span>
                  </td>
                  <td className="center mono">{client.accounts}</td>
                  <td className="right mono">{formatMicros(client.spend)}</td>
                  <td className="right mono" style={{ color: client.roas >= 4 ? 'var(--success)' : client.roas >= 3 ? 'var(--warning)' : 'var(--error)' }}>
                    {client.roas}x
                  </td>
                  <td className="center">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '6px',
                          background: 'var(--border-default)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${client.healthScore}%`,
                            background: client.healthScore >= 80 ? 'var(--success)' : client.healthScore >= 60 ? 'var(--warning)' : 'var(--error)',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{client.healthScore}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{client.lastActivity}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost btn-sm">View</button>
                      <button className="btn btn-ghost btn-sm">...</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
