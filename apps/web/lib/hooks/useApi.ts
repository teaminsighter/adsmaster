'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface UseApiOptions<T> {
  initialData?: T;
  enabled?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isDemo: boolean;
}

/**
 * Custom hook for fetching data from the API
 * Automatically falls back to demo endpoints when real data is not available
 */
export function useApi<T>(
  endpoint: string,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const { initialData = null, enabled = true } = options;
  const [data, setData] = useState<T | null>(initialData as T | null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setIsDemo(result.demo_mode === true);
    } catch (err) {
      console.error('API fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, isDemo };
}

/**
 * Hook for dashboard data
 */
export function useDashboard() {
  return useApi<{
    demo_mode: boolean;
    period: string;
    metrics: {
      spend_micros: number;
      revenue_micros: number;
      roas: number;
      conversions: number;
      impressions: number;
      clicks: number;
      ctr: number;
      cpa_micros: number;
    };
    metrics_change: {
      spend: number;
      revenue: number;
      roas: number;
      conversions: number;
      ctr: number;
      cpa: number;
    };
    health_score: {
      overall: number;
      budget_utilization: number;
      quality_score: number;
      conversion_rate: number;
    };
    platform_breakdown: Array<{
      platform: string;
      spend_micros: number;
      conversions: number;
      roas: number;
    }>;
    chart_data: Array<{
      date: string;
      spend: number;
      conversions: number;
      impressions: number;
    }>;
    top_campaigns: Array<{
      id: string;
      name: string;
      platform: string;
      status: string;
      spend_micros: number;
      conversions: number;
      roas: number;
    }>;
    pending_recommendations: number;
    ai_savings_this_month: number;
  }>('/api/v1/demo/dashboard');
}

/**
 * Hook for campaigns data
 */
export function useCampaigns(filters?: { status?: string; platform?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.platform) params.set('platform', filters.platform);
  const query = params.toString() ? `?${params}` : '';

  return useApi<{
    demo_mode: boolean;
    campaigns: Array<{
      id: string;
      name: string;
      platform: string;
      status: string;
      type: string;
      budget_micros: number;
      budget_type: string;
      spend_micros: number;
      impressions: number;
      clicks: number;
      conversions: number;
      ctr: number;
      cpc_micros: number;
      cpa_micros: number;
      roas: number;
      quality_score: number | null;
    }>;
    total: number;
  }>(`/api/v1/demo/campaigns${query}`);
}

/**
 * Hook for campaign detail
 */
export function useCampaignDetail(campaignId: string) {
  return useApi<{
    demo_mode: boolean;
    campaign: {
      id: string;
      name: string;
      platform: string;
      status: string;
      type: string;
      budget_micros: number;
      spend_micros: number;
      impressions: number;
      clicks: number;
      conversions: number;
      roas: number;
    };
    daily_metrics: Array<{
      date: string;
      spend_micros: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }>;
    keywords: Array<{
      id: string;
      text: string;
      match_type: string;
      status: string;
      impressions: number;
      clicks: number;
      conversions: number;
      spend_micros: number;
      quality_score: number;
    }>;
  }>(`/api/v1/demo/campaigns/${campaignId}`, { enabled: !!campaignId });
}

/**
 * Hook for recommendations
 */
export function useRecommendations(filters?: { severity?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString() ? `?${params}` : '';

  return useApi<{
    demo_mode: boolean;
    recommendations: Array<{
      id: string;
      rule_id: string;
      type: string;
      severity: 'critical' | 'warning' | 'opportunity';
      title: string;
      description: string;
      confidence: number;
      impact_estimate: {
        monthly_savings: number | null;
        potential_gain: number | null;
        summary: string;
      };
      affected_entity: {
        type: string;
        id: string;
        name: string;
        campaign_id?: string;
        campaign_name?: string;
      };
      options: Array<{
        id: number;
        label: string;
        action: string;
        description: string;
        risk: string;
      }>;
      status: string;
      created_at: string;
      expires_at: string;
    }>;
    total: number;
    summary: {
      pending: number;
      by_severity: {
        critical: number;
        warning: number;
        opportunity: number;
      };
      total_savings_micros: number;
      total_potential_micros: number;
    };
  }>(`/api/v1/demo/recommendations${query}`);
}

/**
 * Hook for analytics
 */
export function useAnalytics(period: string = '30d') {
  return useApi<{
    demo_mode: boolean;
    period: string;
    overview: {
      spend_micros: number;
      revenue_micros: number;
      roas: number;
      conversions: number;
      cpa_micros: number;
      clicks: number;
      impressions: number;
      ctr: number;
    };
    changes: {
      spend: number;
      revenue: number;
      roas: number;
      conversions: number;
      cpa: number;
      ctr: number;
    };
    trend_data: Array<{
      date: string;
      spend_micros: number;
      revenue_micros: number;
      conversions: number;
      roas: number;
    }>;
    platform_breakdown: Array<{
      platform: string;
      spend_micros: number;
      conversions: number;
      roas: number;
    }>;
    top_campaigns: Array<{
      id: string;
      name: string;
      platform: string;
      spend_micros: number;
      conversions: number;
      roas: number;
    }>;
  }>(`/api/v1/demo/analytics?period=${period}`);
}

/**
 * Hook for keywords
 */
export function useKeywords(filters?: { status?: string; campaign?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.campaign) params.set('campaign', filters.campaign);
  const query = params.toString() ? `?${params}` : '';

  return useApi<{
    demo_mode: boolean;
    keywords: Array<{
      id: string;
      text: string;
      match_type: string;
      status: string;
      campaign: string;
      impressions: number;
      clicks: number;
      conversions: number;
      spend_micros: number;
      cpa_micros: number;
      quality_score: number;
    }>;
    total: number;
    summary: {
      total_keywords: number;
      enabled: number;
      paused: number;
      total_spend_micros: number;
      avg_quality_score: number;
      wasting_keywords: number;
      wasting_spend_micros: number;
    };
  }>(`/api/v1/demo/keywords${query}`);
}

/**
 * Hook for audiences
 */
export function useAudiences(filters?: { platform?: string; type?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString() ? `?${params}` : '';

  return useApi<{
    demo_mode: boolean;
    audiences: Array<{
      id: string;
      name: string;
      type: string;
      platform: string;
      size: number;
      status: string;
      campaigns: number;
      conversions: number;
      spend_micros: number;
      created_at: string;
    }>;
    total: number;
    summary: {
      total_audiences: number;
      active: number;
      paused: number;
      total_size: number;
      total_conversions: number;
      google_audiences: number;
      meta_audiences: number;
    };
  }>(`/api/v1/demo/audiences${query}`);
}

/**
 * Create audience
 */
export async function createAudience(
  organizationId: string,
  data: {
    name: string;
    platform: 'google' | 'meta';
    type: string;
    source: string;
    lookbackDays?: number;
    description?: string;
  }
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/audiences?organization_id=${organizationId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        platform: data.platform,
        type: data.type,
        source: data.source,
        lookback_days: data.lookbackDays || 30,
        description: data.description,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create audience');
  }

  return response.json();
}

/**
 * API action functions
 */
export async function applyRecommendation(id: string, optionId: number) {
  const response = await fetch(`${API_BASE_URL}/api/v1/demo/recommendations/${id}/apply?option_id=${optionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
}

export async function dismissRecommendation(id: string, reason?: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/demo/recommendations/${id}/dismiss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return response.json();
}

// ============================================================================
// SETTINGS HOOKS
// ============================================================================

/**
 * Hook for user preferences
 */
export function usePreferences(userId: string) {
  return useApi<{
    id: string;
    user_id: string;
    timezone: string;
    currency: string;
    date_format: string;
    theme: string;
    compact_mode: boolean;
    show_cents: boolean;
    default_date_range: string;
    created_at: string;
    updated_at: string;
  }>(`/api/v1/settings/preferences?user_id=${userId}`, { enabled: !!userId });
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  userId: string,
  data: {
    timezone?: string;
    currency?: string;
    date_format?: string;
    theme?: string;
    compact_mode?: boolean;
    show_cents?: boolean;
    default_date_range?: string;
  }
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/settings/preferences?user_id=${userId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update preferences');
  }
  return response.json();
}

/**
 * Hook for notification settings
 */
export function useNotificationSettings(userId: string, organizationId?: string) {
  const params = new URLSearchParams({ user_id: userId });
  if (organizationId) params.set('organization_id', organizationId);

  return useApi<{
    user_id: string;
    organization_id: string | null;
    settings: Array<{
      notification_type: string;
      email_enabled: boolean;
      push_enabled: boolean;
      slack_enabled: boolean;
    }>;
    slack_connected: boolean;
  }>(`/api/v1/settings/notifications?${params}`, { enabled: !!userId });
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(
  userId: string,
  organizationId: string | undefined,
  settings: Array<{
    notification_type: string;
    email_enabled: boolean;
    push_enabled: boolean;
    slack_enabled: boolean;
  }>
) {
  const params = new URLSearchParams({ user_id: userId });
  if (organizationId) params.set('organization_id', organizationId);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/settings/notifications?${params}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update notification settings');
  }
  return response.json();
}

/**
 * Hook for team members
 */
export function useTeamMembers(organizationId: string) {
  return useApi<{
    organization_id: string;
    members: Array<{
      id: string;
      email: string;
      name: string | null;
      role: string;
      status: string;
      last_active_at: string | null;
      invited_at: string | null;
      accepted_at: string | null;
    }>;
    total: number;
    max_members: number;
  }>(`/api/v1/settings/team?organization_id=${organizationId}`, { enabled: !!organizationId });
}

/**
 * Invite team member
 */
export async function inviteTeamMember(
  organizationId: string,
  data: { email: string; role: string }
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/settings/team/invite?organization_id=${organizationId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to invite team member');
  }
  return response.json();
}

/**
 * Update team member role
 */
export async function updateTeamMember(
  organizationId: string,
  memberId: string,
  data: { role: string }
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/settings/team/${memberId}?organization_id=${organizationId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update team member');
  }
  return response.json();
}

/**
 * Remove team member
 */
export async function removeTeamMember(organizationId: string, memberId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/settings/team/${memberId}?organization_id=${organizationId}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to remove team member');
  }
  return response.json();
}

/**
 * Hook for API keys
 */
export function useApiKeys(organizationId: string) {
  return useApi<{
    organization_id: string;
    api_keys: Array<{
      id: string;
      name: string;
      key_prefix: string;
      permissions: string[];
      rate_limit_per_minute: number;
      rate_limit_per_day: number;
      last_used_at: string | null;
      usage_count: number;
      is_active: boolean;
      created_at: string;
      expires_at: string | null;
    }>;
    total: number;
    max_keys: number;
  }>(`/api/v1/settings/api-keys?organization_id=${organizationId}`, { enabled: !!organizationId });
}

/**
 * Create API key
 */
export async function createApiKey(
  organizationId: string,
  data: {
    name: string;
    permissions: string[];
    rate_limit_per_minute?: number;
    rate_limit_per_day?: number;
    expires_in_days?: number;
  }
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/settings/api-keys?organization_id=${organizationId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create API key');
  }
  return response.json();
}

/**
 * Revoke API key
 */
export async function revokeApiKey(organizationId: string, keyId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/settings/api-keys/${keyId}?organization_id=${organizationId}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to revoke API key');
  }
  return response.json();
}

/**
 * Hook for billing info
 */
export function useBilling(organizationId: string) {
  return useApi<{
    organization_id: string;
    subscription: {
      id: string;
      plan_name: string;
      plan_price_cents: number;
      billing_interval: string;
      status: string;
      trial_ends_at: string | null;
      current_period_start: string;
      current_period_end: string;
      cancel_at_period_end: boolean;
      max_ad_accounts: number;
      max_team_members: number;
      max_api_calls_per_month: number;
    };
    payment_method: {
      id: string;
      card_brand: string;
      card_last4: string;
      card_exp_month: number;
      card_exp_year: number;
      is_default: boolean;
    } | null;
    usage: {
      ad_accounts_used: number;
      team_members_used: number;
      api_calls_this_month: number;
    };
    invoices: Array<{
      id: string;
      invoice_number: string;
      amount_cents: number;
      currency: string;
      status: string;
      invoice_date: string;
      paid_at: string | null;
    }>;
  }>(`/api/v1/settings/billing?organization_id=${organizationId}`, { enabled: !!organizationId });
}

/**
 * Hook for available plans
 */
export function usePlans() {
  return useApi<{
    plans: Array<{
      name: string;
      display_name: string;
      price_cents_monthly: number | null;
      price_cents_yearly: number | null;
      features: {
        max_ad_accounts: number;
        max_team_members: number;
        max_api_calls_per_month: number;
        ai_recommendations: boolean;
        custom_reports: boolean;
        priority_support: boolean;
        white_label: boolean;
      };
    }>;
  }>('/api/v1/settings/billing/plans');
}

// ============================================================================
// CONNECTED ACCOUNTS HOOKS
// ============================================================================

/**
 * Hook for connected ad accounts
 */
export function useConnectedAccounts() {
  return useApi<{
    demo_mode: boolean;
    accounts: Array<{
      id: string;
      platform: 'google' | 'meta';
      name: string;
      external_id: string;
      status: 'active' | 'paused' | 'error' | 'disconnected';
      currency: string;
      timezone: string;
      last_sync: string;
      spend_30d_micros: number;
    }>;
    total: number;
  }>('/api/v1/demo/accounts');
}

/**
 * Disconnect an ad account
 */
export async function disconnectAccount(accountId: string) {
  const response = await fetch(
    `${API_BASE_URL}/accounts/${accountId}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to disconnect account');
  }
  return response.json();
}

/**
 * Trigger sync for an ad account
 */
export async function syncAccount(accountId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/sync/trigger?account_id=${accountId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to trigger sync');
  }
  return response.json();
}

// ============================================================================
// USER PROFILE HOOKS
// ============================================================================

/**
 * Hook for user profile
 */
export function useUserProfile(userId: string) {
  return useApi<{
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    organization: {
      id: string;
      name: string;
      role: string;
    };
    subscription: {
      plan_name: string;
      status: string;
    };
  }>(`/api/v1/settings/profile?user_id=${userId}`, { enabled: !!userId });
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  data: { name?: string; email?: string }
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/settings/profile?user_id=${userId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update profile');
  }
  return response.json();
}
