'use client';

import { useState, useEffect } from 'react';
import { UserFilters as Filters } from '@/lib/hooks/useAdminApi';

interface UserFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onRefresh: () => void;
  onExport: () => void;
  onAddUser?: () => void;
}

export default function UserFilters({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  onAddUser,
}: UserFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ ...filters, search: localSearch || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, filters, onFiltersChange]);

  const handleFilterChange = (key: keyof Filters, value: string | boolean | undefined) => {
    const newValue = value === '' ? undefined : value;
    onFiltersChange({ ...filters, [key]: newValue });
  };

  const clearFilters = () => {
    setLocalSearch('');
    onFiltersChange({});
  };

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <div className="filters-container">
      <div className="filters-row">
        {/* Search */}
        <div className="filter-group search-group">
          <input
            type="text"
            placeholder="Search by email, name, or ID..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="unverified">Unverified</option>
        </select>

        {/* Plan */}
        <select
          value={filters.plan || ''}
          onChange={(e) => handleFilterChange('plan', e.target.value)}
          className="filter-select"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="agency">Agency</option>
          <option value="enterprise">Enterprise</option>
        </select>

        {/* Signup Date */}
        <select
          value={filters.signup_date || ''}
          onChange={(e) => handleFilterChange('signup_date', e.target.value)}
          className="filter-select"
        >
          <option value="">Signup Date</option>
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
        </select>

        {/* Last Active */}
        <select
          value={filters.last_active || ''}
          onChange={(e) => handleFilterChange('last_active', e.target.value)}
          className="filter-select"
        >
          <option value="">Last Active</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d+">90+ days ago</option>
          <option value="never">Never</option>
        </select>
      </div>

      <div className="filters-actions">
        {hasFilters && (
          <button onClick={clearFilters} className="btn-clear">
            Clear Filters
          </button>
        )}
        <button onClick={onRefresh} className="btn-refresh">
          Refresh
        </button>
        <button onClick={onExport} className="btn-export">
          Export
        </button>
        {onAddUser && (
          <button onClick={onAddUser} className="btn-add">
            + Add User
          </button>
        )}
      </div>

      <style jsx>{`
        .filters-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .filters-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .filter-group {
          flex: 1;
          min-width: 200px;
        }

        .search-group {
          flex: 2;
          max-width: 350px;
        }

        .search-input {
          width: 100%;
          padding: 10px 14px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .search-input::placeholder {
          color: var(--admin-text-dim);
        }

        .search-input:focus {
          border-color: var(--admin-accent);
        }

        .filter-select {
          padding: 10px 14px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
          outline: none;
          cursor: pointer;
          min-width: 140px;
          transition: border-color 0.15s ease;
        }

        .filter-select:focus {
          border-color: var(--admin-accent);
        }

        .filters-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .btn-clear,
        .btn-refresh,
        .btn-export,
        .btn-add {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .btn-clear {
          background: transparent;
          color: var(--admin-text-muted);
          border-color: var(--admin-border);
        }

        .btn-clear:hover {
          color: var(--admin-text);
          border-color: var(--admin-text-muted);
        }

        .btn-refresh {
          background: var(--admin-inner-bg);
          color: var(--admin-text);
          border-color: var(--admin-border);
        }

        .btn-refresh:hover {
          background: var(--admin-card-hover);
          border-color: var(--admin-accent);
        }

        .btn-export {
          background: rgba(59, 130, 246, 0.15);
          color: var(--admin-info);
        }

        .btn-export:hover {
          background: rgba(59, 130, 246, 0.25);
        }

        .btn-add {
          background: var(--admin-accent);
          color: white;
        }

        .btn-add:hover {
          background: var(--admin-accent-hover);
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .filters-row {
            flex-direction: column;
          }

          .filter-group,
          .search-group {
            max-width: none;
            width: 100%;
          }

          .filter-select {
            width: 100%;
          }

          .filters-actions {
            flex-wrap: wrap;
          }

          .filters-actions button {
            flex: 1;
            min-width: 100px;
          }
        }
      `}</style>
    </div>
  );
}
