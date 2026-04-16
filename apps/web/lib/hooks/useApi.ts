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
    ad_groups?: Array<{
      id: string;
      name: string;
      status: string;
      keywords: number;
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

// ============================================================================
// ML / FORECASTING HOOKS
// ============================================================================

export interface ForecastPrediction {
  date: string;
  value: number;
  lower_bound: number;
  upper_bound: number;
}

export interface MLAnomaly {
  id: string;
  metric: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  actual_value: number;
  expected_value: number;
  deviation_pct: number;
  description: string;
  affected_entity: {
    campaign_id?: string;
    campaign_name?: string;
  } | null;
}

/**
 * Hook for ML service status
 */
export function useMLStatus() {
  return useApi<{
    gcp_project: string;
    bigquery_dataset: string;
    services: {
      bigquery_ml: string;
      vertex_ai: string;
      local_fallback: string;
    };
    features: {
      spend_forecast: boolean;
      conversion_forecast: boolean;
      anomaly_detection: boolean;
      keyword_prediction: boolean;
      search_term_classification: boolean;
    };
  }>('/api/v1/ml/status');
}

/**
 * Hook for demo spend/conversion forecasts (no auth required)
 */
export function useMLDemoForecast() {
  return useApi<{
    data: {
      spend: {
        metric: string;
        predictions: ForecastPrediction[];
        model_info: { type: string };
      };
      conversions: {
        metric: string;
        predictions: ForecastPrediction[];
        model_info: { type: string };
      };
    };
    demo_mode: boolean;
    error: string | null;
  }>('/api/v1/ml/demo/forecast');
}

/**
 * Hook for demo anomalies (no auth required)
 */
export function useMLDemoAnomalies() {
  return useApi<{
    data: {
      anomalies: MLAnomaly[];
    };
    demo_mode: boolean;
    error: string | null;
  }>('/api/v1/ml/demo/anomalies');
}

// ============================================================================
// AUCTION INSIGHTS HOOKS
// ============================================================================

export interface AuctionInsightEntry {
  domain: string;
  impression_share: number | null;
  overlap_rate: number | null;
  position_above_rate: number | null;
  top_impression_pct: number | null;
  abs_top_impression_pct: number | null;
  outranking_share: number | null;
}

export interface LeadGenInsights {
  impression_share_lost: number;
  top_competitor: string | null;
  top_competitor_share: number | null;
  potential_leads_missed_pct: number;
  recommendation: string;
}

export interface AuctionInsightsData {
  campaign_id: string;
  campaign_name: string;
  date_from: string;
  date_to: string;
  your_impression_share: number | null;
  insights: AuctionInsightEntry[];
  total_competitors: number;
  lead_gen_insights: LeadGenInsights | null;
  demo_mode?: boolean;
}

/**
 * Hook for auction insights (competitor analysis)
 * Shows who you're competing against and impression share lost
 */
export function useAuctionInsights(accountId: string, campaignId: string, dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  const query = params.toString() ? `?${params}` : '';

  return useApi<AuctionInsightsData>(
    `/accounts/${accountId}/campaigns/${campaignId}/auction-insights${query}`,
    { enabled: !!accountId && !!campaignId }
  );
}

// ============================================================================
// SESSION RECORDINGS HOOKS
// ============================================================================

export interface RecordingSummary {
  id: string;
  visitor_id: string;
  session_id: string;
  visitor_email: string | null;
  visitor_name: string | null;
  duration_seconds: number;
  page_count: number;
  event_count: number;
  entry_url: string | null;
  entry_path: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  screen_width: number | null;
  screen_height: number | null;
  country_code: string | null;
  city: string | null;
  rage_clicks: number;
  dead_clicks: number;
  error_count: number;
  utm_source: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  fbclid: string | null;
  status: string;
  is_starred: boolean;
  started_at: string;
  ended_at: string | null;
}

export interface RecordingDetail extends RecordingSummary {
  organization_id: string;
  visitor_phone: string | null;
  browser_version: string | null;
  os_version: string | null;
  user_agent: string | null;
  country_name: string | null;
  region: string | null;
  pages_visited: string[];
  referrer: string | null;
  custom_data: Record<string, unknown> | null;
}

export interface RecordingMarker {
  id: string;
  recording_id: string;
  timestamp_ms: number;
  marker_type: string;
  label: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface RecordingStats {
  total_recordings: number;
  recordings_today: number;
  recordings_this_week: number;
  avg_duration_seconds: number;
  total_rage_clicks: number;
  total_dead_clicks: number;
  total_errors: number;
  device_breakdown: Record<string, number>;
  top_pages: Array<{ path: string; count: number }>;
  top_errors: Array<{ message: string; count: number }>;
}

export interface RecordingSettings {
  is_enabled: boolean;
  sample_rate: number;
  max_duration_seconds: number;
  capture_mouse_movement: boolean;
  capture_scroll: boolean;
  capture_input: boolean;
  mask_all_inputs: boolean;
  mask_selectors: string[];
  block_selectors: string[];
  ignore_selectors: string[];
  monthly_limit: number;
  recordings_this_month: number;
}

export interface RecordingsListResponse {
  recordings: RecordingSummary[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

/**
 * Hook for session recordings list with filters
 */
export function useRecordings(filters?: {
  page?: number;
  page_size?: number;
  search?: string;
  visitor_id?: string;
  device?: string;
  has_rage_clicks?: boolean;
  has_errors?: boolean;
  min_duration?: number;
  max_duration?: number;
  date_from?: string;
  date_to?: string;
  starred_only?: boolean;
  order_by?: string;
  order_dir?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.page_size) params.set('page_size', String(filters.page_size));
  if (filters?.search) params.set('search', filters.search);
  if (filters?.visitor_id) params.set('visitor_id', filters.visitor_id);
  if (filters?.device) params.set('device', filters.device);
  if (filters?.has_rage_clicks !== undefined) params.set('has_rage_clicks', String(filters.has_rage_clicks));
  if (filters?.has_errors !== undefined) params.set('has_errors', String(filters.has_errors));
  if (filters?.min_duration !== undefined) params.set('min_duration', String(filters.min_duration));
  if (filters?.max_duration !== undefined) params.set('max_duration', String(filters.max_duration));
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);
  if (filters?.starred_only) params.set('starred_only', 'true');
  if (filters?.order_by) params.set('order_by', filters.order_by);
  if (filters?.order_dir) params.set('order_dir', filters.order_dir);
  const query = params.toString() ? `?${params}` : '';

  return useApi<RecordingsListResponse>(`/api/v1/recordings${query}`);
}

/**
 * Hook for recording statistics
 */
export function useRecordingStats(days: number = 30) {
  return useApi<RecordingStats>(`/api/v1/recordings/stats?days=${days}`);
}

/**
 * Hook for recording settings
 */
export function useRecordingSettings() {
  return useApi<RecordingSettings>('/api/v1/recordings/settings');
}

/**
 * Hook for a single recording detail
 */
export function useRecording(recordingId: string) {
  return useApi<RecordingDetail>(
    `/api/v1/recordings/${recordingId}`,
    { enabled: !!recordingId }
  );
}

/**
 * Hook for recording events (rrweb data for playback)
 */
export function useRecordingEvents(recordingId: string) {
  return useApi<{
    recording_id: string;
    chunks: number;
    total_events: number;
    events: Array<Record<string, unknown>>;
  }>(
    `/api/v1/recordings/${recordingId}/events`,
    { enabled: !!recordingId }
  );
}

/**
 * Hook for recording markers
 */
export function useRecordingMarkers(recordingId: string) {
  return useApi<RecordingMarker[]>(
    `/api/v1/recordings/${recordingId}/markers`,
    { enabled: !!recordingId }
  );
}

/**
 * Star/unstar a recording
 */
export async function toggleRecordingStar(recordingId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/recordings/${recordingId}/star`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to toggle star');
  }
  return response.json();
}

/**
 * Delete a recording
 */
export async function deleteRecording(recordingId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/recordings/${recordingId}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete recording');
  }
  return response.json();
}

/**
 * Update recording settings
 */
export async function updateRecordingSettings(settings: Partial<RecordingSettings>) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/recordings/settings`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update settings');
  }
  return response.json();
}


// ============================================================================
// STUDIO DASHBOARD BUILDER
// ============================================================================

export interface StudioWidget {
  id: string;
  dashboard_id: string;
  type: string;
  title?: string;
  subtitle?: string;
  icon?: string;
  grid_x: number;
  grid_y: number;
  grid_w: number;
  grid_h: number;
  min_w: number;
  min_h: number;
  data_source: string;
  data_source_id?: string;
  ad_account_id?: string;
  metrics: Array<{field: string; aggregation?: string; label?: string; format?: string}>;
  dimensions: Array<{field: string; label?: string}>;
  filters: Array<{field: string; operator: string; value: unknown}>;
  sort_by: {field?: string; direction?: string};
  limit_rows: number;
  date_range?: string;
  visual_config: {
    colors: string[];
    showLegend: boolean;
    showGrid: boolean;
    showLabels: boolean;
    stacked: boolean;
    smooth: boolean;
  };
  show_comparison: boolean;
  comparison_type?: string;
  formula?: string;
  manual_data?: Record<string, unknown>;
  conditional_rules: Array<{condition: string; color: string; icon?: string}>;
  created_at: string;
  updated_at: string;
}

export interface StudioDashboard {
  id: string;
  name: string;
  description?: string;
  layout: Array<{i: string; x: number; y: number; w: number; h: number}>;
  settings: {
    theme: string;
    refreshInterval: number;
    backgroundColor: string;
  };
  default_date_range: string;
  default_timezone: string;
  default_comparison: string;
  is_published: boolean;
  is_public: boolean;
  share_token?: string;
  view_count: number;
  widgets: StudioWidget[];
  created_at: string;
  updated_at: string;
}

export interface StudioDashboardSummary {
  id: string;
  name: string;
  description?: string;
  widget_count: number;
  is_published: boolean;
  is_public: boolean;
  share_url?: string;
  view_count: number;
  thumbnail?: string;
  created_at: string;
  updated_at: string;
}

export interface StudioTemplate {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  required_sources: string[];
  config: Record<string, unknown>;
  is_premium: boolean;
  usage_count: number;
  rating: number;
}

export interface StudioDataSource {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  row_count: number;
  last_refreshed_at?: string;
  created_at: string;
}

interface DashboardsListResponse {
  dashboards: StudioDashboardSummary[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Hook for listing studio dashboards
 */
export function useStudioDashboards(page: number = 1, limit: number = 20) {
  return useApi<DashboardsListResponse>(`/api/v1/studio/dashboards?page=${page}&limit=${limit}`);
}

/**
 * Hook for getting a single dashboard with widgets
 */
export function useStudioDashboard(dashboardId: string) {
  return useApi<StudioDashboard>(`/api/v1/studio/dashboards/${dashboardId}`, {
    enabled: !!dashboardId
  });
}

/**
 * Hook for listing templates
 */
export function useStudioTemplates(category?: string) {
  const query = category ? `?category=${category}` : '';
  return useApi<{templates: StudioTemplate[]}>(`/api/v1/studio/templates${query}`);
}

/**
 * Hook for listing data sources
 */
export function useStudioDataSources() {
  return useApi<{data_sources: StudioDataSource[]}>(`/api/v1/studio/data-sources`);
}

/**
 * Hook for getting widget data
 */
export function useWidgetData(widgetId: string, dateRange?: string) {
  const query = dateRange ? `?date_range=${dateRange}` : '';
  return useApi<{data: unknown; demo_mode?: boolean}>(`/api/v1/studio/widgets/${widgetId}/data${query}`, {
    enabled: !!widgetId
  });
}

/**
 * Create a new dashboard
 */
export async function createStudioDashboard(data: {
  name: string;
  description?: string;
  default_date_range?: string;
  template_id?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/studio/dashboards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create dashboard');
  }
  return response.json();
}

/**
 * Update a dashboard
 */
export async function updateStudioDashboard(dashboardId: string, data: {
  name?: string;
  description?: string;
  settings?: Record<string, unknown>;
  is_published?: boolean;
  is_public?: boolean;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/studio/dashboards/${dashboardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update dashboard');
  }
  return response.json();
}

/**
 * Delete a dashboard
 */
export async function deleteStudioDashboard(dashboardId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/studio/dashboards/${dashboardId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete dashboard');
  }
  return response.json();
}

/**
 * Duplicate a dashboard
 */
export async function duplicateStudioDashboard(dashboardId: string, name: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/studio/dashboards/${dashboardId}/duplicate?name=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to duplicate dashboard');
  }
  return response.json();
}

/**
 * Update dashboard layout
 */
export async function updateDashboardLayout(
  dashboardId: string,
  layout: Array<{i: string; x: number; y: number; w: number; h: number}>
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/studio/dashboards/${dashboardId}/layout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(layout),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update layout');
  }
  return response.json();
}

/**
 * Create a widget
 */
export async function createStudioWidget(dashboardId: string, data: Partial<StudioWidget>) {
  const response = await fetch(`${API_BASE_URL}/api/v1/studio/dashboards/${dashboardId}/widgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create widget');
  }
  return response.json();
}

/**
 * Update a widget
 */
export async function updateStudioWidget(widgetId: string, data: Partial<StudioWidget>) {
  const response = await fetch(`${API_BASE_URL}/api/v1/studio/widgets/${widgetId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update widget');
  }
  return response.json();
}

/**
 * Delete a widget
 */
export async function deleteStudioWidget(widgetId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/studio/widgets/${widgetId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete widget');
  }
  return response.json();
}

/**
 * Hook for public dashboard view (no auth)
 */
export function usePublicDashboard(shareToken: string) {
  return useApi<{dashboard: StudioDashboard}>(`/api/v1/studio/view/${shareToken}`, {
    enabled: !!shareToken
  });
}


// =====================================================
// First-Party Domains Types & Hooks
// =====================================================

export interface Domain {
  id: string;
  domain: string;
  root_domain: string;
  subdomain: string;
  verification_code: string;
  cname_target: string;
  status: 'pending' | 'verifying' | 'verified' | 'failed' | 'expired';
  verification_method: 'cname' | 'txt';
  ssl_status: 'pending' | 'provisioning' | 'active' | 'failed' | null;
  verified_at: string | null;
  is_active: boolean;
  request_count: number;
  last_verification_attempt: string | null;
  verification_attempts: number;
  last_verification_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface DomainListResponse {
  domains: Domain[];
  total: number;
  limit: number;
  can_add_more: boolean;
}

export interface VerificationResult {
  success: boolean;
  status: string;
  message: string;
  dns_records: Array<{type: string; target?: string; value?: string}> | null;
  expected_value: string | null;
  actual_value: string | null;
}

export interface DNSTemplate {
  id: string;
  name: string;
  provider: string;
  instructions: Array<{step: number; title: string; description: string}>;
  example_records: Record<string, unknown>;
  provider_docs_url: string | null;
  estimated_propagation_minutes: number;
}

export interface SetupInstructions {
  domain: string;
  subdomain: string;
  verification_method: string;
  dns_record: {
    type: string;
    name: string;
    target?: string;
    value?: string;
    ttl: string;
  };
  instructions_text: string;
  template: DNSTemplate | null;
  cname_target: string;
  verification_code: string;
  estimated_propagation_minutes: number;
}

export interface VerificationHistoryItem {
  id: string;
  domain_id: string;
  verification_type: string;
  status: string;
  dns_records: Array<Record<string, unknown>> | null;
  expected_value: string | null;
  actual_value: string | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

/**
 * Hook for listing domains
 */
export function useDomains() {
  return useApi<DomainListResponse>('/api/v1/domains/');
}

/**
 * Hook for single domain
 */
export function useDomain(domainId: string) {
  return useApi<Domain>(`/api/v1/domains/${domainId}`, {
    enabled: !!domainId
  });
}

/**
 * Hook for DNS templates
 */
export function useDNSTemplates() {
  return useApi<DNSTemplate[]>('/api/v1/domains/dns/templates');
}

/**
 * Hook for domain setup instructions
 */
export function useDomainSetupInstructions(domainId: string, provider: string = 'other') {
  return useApi<SetupInstructions>(`/api/v1/domains/${domainId}/setup-instructions?provider=${provider}`, {
    enabled: !!domainId
  });
}

/**
 * Hook for domain verification history
 */
export function useDomainVerificationHistory(domainId: string, limit: number = 10) {
  return useApi<{history: VerificationHistoryItem[]}>(`/api/v1/domains/${domainId}/verification-history?limit=${limit}`, {
    enabled: !!domainId
  });
}

/**
 * Hook for domain stats
 */
export function useDomainStats(domainId: string) {
  return useApi<{domain: string; is_active: boolean; status: string; total_requests: number; last_request_at: string | null}>(`/api/v1/domains/${domainId}/stats`, {
    enabled: !!domainId
  });
}

/**
 * Create a new domain
 */
export async function createDomain(data: {domain: string; verification_method?: 'cname' | 'txt'}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/domains/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create domain');
  }
  return response.json() as Promise<Domain>;
}

/**
 * Delete a domain
 */
export async function deleteDomain(domainId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/domains/${domainId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete domain');
  }
  return response.json();
}

/**
 * Verify a domain
 */
export async function verifyDomain(domainId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/domains/${domainId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Verification failed');
  }
  return response.json() as Promise<VerificationResult>;
}

/**
 * Update domain (activate/deactivate)
 */
export async function updateDomain(domainId: string, data: {is_active?: boolean}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/domains/${domainId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update domain');
  }
  return response.json() as Promise<Domain>;
}

/**
 * Refresh verification code
 */
export async function refreshDomainVerificationCode(domainId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/domains/${domainId}/refresh-verification-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to refresh verification code');
  }
  return response.json() as Promise<{success: boolean; verification_code: string; message: string}>;
}


// =====================================================
// CRM Integration Types & Hooks
// =====================================================

export interface CRMIntegration {
  id: string;
  provider: 'pipedrive' | 'activecampaign' | 'hubspot' | 'salesforce' | 'zoho';
  name: string;
  description: string | null;
  settings: Record<string, unknown>;
  sync_direction: 'to_crm' | 'from_crm' | 'both';
  sync_frequency: 'realtime' | 'hourly' | 'daily';
  sync_enabled: boolean;
  is_active: boolean;
  connection_status: 'pending' | 'connected' | 'error' | 'expired';
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_records: number;
  total_synced: number;
  field_mapping: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  display_order: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
  is_default: boolean;
  leads_count: number;
  total_value_micros: number;
}

export interface Lead {
  id: string;
  visitor_id: string | null;
  conversion_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  phone: string | null;
  value_micros: number;
  stage_id: string | null;
  stage_name: string | null;
  source: string | null;
  ad_platform: string | null;
  campaign_name: string | null;
  crm_contact_id: string | null;
  crm_contact_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadsByStage {
  stage: PipelineStage;
  leads: Array<{
    id: string;
    name: string;
    email: string | null;
    company: string | null;
    value: number;
    source: string | null;
    created_at: string;
  }>;
  count: number;
}

export interface CRMSyncLog {
  id: string;
  integration_id: string;
  sync_type: string;
  direction: string;
  status: string;
  total_records: number;
  success_count: number;
  failure_count: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

/**
 * Hook for CRM integrations list
 */
export function useCRMIntegrations() {
  return useApi<CRMIntegration[]>('/api/v1/crm/integrations');
}

/**
 * Hook for single CRM integration
 */
export function useCRMIntegration(integrationId: string) {
  return useApi<CRMIntegration>(`/api/v1/crm/integrations/${integrationId}`, {
    enabled: !!integrationId
  });
}

/**
 * Hook for pipeline stages
 */
export function usePipelineStages() {
  return useApi<PipelineStage[]>('/api/v1/crm/pipeline/stages');
}

/**
 * Hook for leads list
 */
export function useLeads(stageId?: string, limit: number = 50, offset: number = 0) {
  const params = new URLSearchParams();
  if (stageId) params.append('stage_id', stageId);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  return useApi<{leads: Lead[]; total: number; limit: number; offset: number}>(`/api/v1/crm/leads?${params}`);
}

/**
 * Hook for leads grouped by stage (Kanban view)
 */
export function useLeadsByStage() {
  return useApi<LeadsByStage[]>('/api/v1/crm/leads/by-stage');
}

/**
 * Hook for CRM sync logs
 */
export function useCRMSyncLogs(integrationId?: string, limit: number = 20) {
  const params = new URLSearchParams();
  if (integrationId) params.append('integration_id', integrationId);
  params.append('limit', limit.toString());
  return useApi<CRMSyncLog[]>(`/api/v1/crm/sync-logs?${params}`);
}

/**
 * Create a new CRM integration
 */
export async function createCRMIntegration(data: {
  provider: string;
  name: string;
  credentials: Record<string, string>;
  settings?: Record<string, unknown>;
  sync_direction?: string;
  sync_frequency?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/crm/integrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create integration');
  }
  return response.json() as Promise<CRMIntegration>;
}

/**
 * Update a CRM integration
 */
export async function updateCRMIntegration(integrationId: string, data: Partial<CRMIntegration>) {
  const response = await fetch(`${API_BASE_URL}/api/v1/crm/integrations/${integrationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update integration');
  }
  return response.json() as Promise<CRMIntegration>;
}

/**
 * Delete a CRM integration
 */
export async function deleteCRMIntegration(integrationId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/crm/integrations/${integrationId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete integration');
  }
  return response.json();
}

/**
 * Test CRM integration connection
 */
export async function testCRMIntegration(integrationId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/crm/integrations/${integrationId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Connection test failed');
  }
  return response.json() as Promise<{success: boolean; message: string; status: string}>;
}

/**
 * Trigger CRM sync
 */
export async function syncCRMIntegration(integrationId: string, direction: string = 'both') {
  const response = await fetch(`${API_BASE_URL}/api/v1/crm/integrations/${integrationId}/sync?direction=${direction}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Sync failed');
  }
  return response.json() as Promise<{success: boolean; message: string; sync_id: string}>;
}

/**
 * Update a lead (move to different stage, update value)
 */
export async function updateLead(leadId: string, data: {stage_id?: string; value_micros?: number}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/crm/leads/${leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update lead');
  }
  return response.json();
}

/**
 * Sync a single lead to CRM
 */
export async function syncLeadToCRM(leadId: string, integrationId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/crm/leads/${leadId}/sync-to-crm?integration_id=${integrationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to sync lead');
  }
  return response.json() as Promise<{success: boolean; crm_contact_id: string; crm_url: string}>;
}

/**
 * Create a pipeline stage
 */
export async function createPipelineStage(name: string, color: string = '#6B7280') {
  const response = await fetch(`${API_BASE_URL}/api/v1/crm/pipeline/stages?name=${encodeURIComponent(name)}&color=${encodeURIComponent(color)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create stage');
  }
  return response.json() as Promise<PipelineStage>;
}

/**
 * Update a pipeline stage
 */
export async function updatePipelineStage(stageId: string, data: {name?: string; color?: string; display_order?: number}) {
  const params = new URLSearchParams();
  if (data.name) params.append('name', data.name);
  if (data.color) params.append('color', data.color);
  if (data.display_order !== undefined) params.append('display_order', data.display_order.toString());

  const response = await fetch(`${API_BASE_URL}/api/v1/crm/pipeline/stages/${stageId}?${params}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update stage');
  }
  return response.json();
}

/**
 * Delete a pipeline stage
 */
export async function deletePipelineStage(stageId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/crm/pipeline/stages/${stageId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete stage');
  }
  return response.json();
}


// =====================================================
// CSV IMPORT & CONVERSION TEMPLATES HOOKS
// =====================================================

export interface ImportPreviewRow {
  row_number: number;
  data: Record<string, unknown>;
  is_duplicate: boolean;
  duplicate_reason: string | null;
  validation_errors: string[];
}

export interface ImportPreviewResponse {
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  error_rows: number;
  preview: ImportPreviewRow[];
  detected_columns: string[];
  suggested_mappings: Record<string, string>;
}

export interface ImportConfig {
  column_mappings: Array<{csv_column: string; target_field: string}>;
  date_format: string;
  skip_duplicates: boolean;
  duplicate_check_fields: string[];
  default_conversion_type: string;
  default_source: string;
  default_currency: string;
}

export interface ImportResult {
  status: string;
  total_rows: number;
  imported: number;
  skipped_duplicates: number;
  failed: number;
  errors: Array<{row: number; error: string}>;
}

export interface ConversionTemplate {
  id: string;
  name: string;
  description: string | null;
  conversion_type: string;
  default_value: number | null;
  currency: string;
  custom_fields: Record<string, unknown>;
  is_default: boolean;
}

export interface ImportHistoryEntry {
  filename: string;
  count: number;
  first_import: string;
  last_import: string;
}

/**
 * Hook for conversion templates
 */
export function useConversionTemplates() {
  return useApi<ConversionTemplate[]>('/api/v1/conversions/import/templates');
}

/**
 * Hook for import history
 */
export function useImportHistory(limit: number = 20) {
  return useApi<{imports: ImportHistoryEntry[]}>(`/api/v1/conversions/import/history?limit=${limit}`);
}

/**
 * Preview CSV import (analyze file without importing)
 */
export async function previewCSVImport(file: File, skipDuplicates: boolean = true) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/conversions/import/preview?skip_duplicates=${skipDuplicates}&max_preview=50`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to preview import');
  }

  return response.json() as Promise<ImportPreviewResponse>;
}

/**
 * Execute CSV import
 */
export async function executeCSVImport(file: File, config: ImportConfig) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/conversions/import/execute?config=${encodeURIComponent(JSON.stringify(config))}`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to execute import');
  }

  return response.json() as Promise<ImportResult>;
}

/**
 * Create a conversion template
 */
export async function createConversionTemplate(data: {
  name: string;
  description?: string;
  conversion_type: string;
  default_value?: number;
  currency?: string;
  custom_fields?: Record<string, unknown>;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/conversions/import/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create template');
  }

  return response.json() as Promise<ConversionTemplate>;
}

/**
 * Delete a conversion template
 */
export async function deleteConversionTemplate(templateId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/conversions/import/templates/${templateId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete template');
  }

  return response.json();
}

/**
 * Download sample CSV file
 */
export function getImportSampleCSVUrl() {
  return `${API_BASE_URL}/api/v1/conversions/import/sample-csv`;
}


// =====================================================
// LIVE DEBUG HOOKS
// =====================================================

export interface LiveEvent {
  id: string;
  event_type: string;
  timestamp: string;
  visitor_id: string;
  session_id: string | null;
  page_url: string | null;
  page_title: string | null;
  referrer: string | null;
  data: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  country: string | null;
  city: string | null;
}

export interface LiveEventStats {
  total_events_last_hour: number;
  events_by_type: Record<string, number>;
  active_visitors: number;
  top_pages: Array<{url: string; count: number}>;
  top_referrers: Array<{referrer: string; count: number}>;
}

/**
 * Hook for recent live events (non-streaming)
 */
export function useRecentEvents(options?: {
  limit?: number;
  event_type?: string;
  minutes?: number;
}) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.event_type) params.set('event_type', options.event_type);
  if (options?.minutes) params.set('minutes', String(options.minutes));
  const query = params.toString() ? `?${params}` : '';

  return useApi<{events: LiveEvent[]; total: number}>(`/api/v1/live-debug/recent${query}`);
}

/**
 * Hook for live event statistics
 */
export function useLiveEventStats(minutes: number = 60) {
  return useApi<LiveEventStats>(`/api/v1/live-debug/stats?minutes=${minutes}`);
}

/**
 * Hook for visitor's event history
 */
export function useVisitorEvents(visitorId: string, limit: number = 100) {
  return useApi<{visitor_id: string; events: LiveEvent[]; total: number}>(
    `/api/v1/live-debug/visitor/${visitorId}?limit=${limit}`,
    { enabled: !!visitorId }
  );
}

/**
 * Hook for session events
 */
export function useSessionEvents(sessionId: string) {
  return useApi<{session_id: string; events: LiveEvent[]; total: number; duration_seconds: number}>(
    `/api/v1/live-debug/session/${sessionId}`,
    { enabled: !!sessionId }
  );
}

/**
 * Get SSE stream URL for live events
 */
export function getLiveStreamUrl(eventTypes?: string[]) {
  const params = eventTypes ? `?event_types=${eventTypes.join(',')}` : '';
  return `${API_BASE_URL}/api/v1/live-debug/stream${params}`;
}

/**
 * Send a test event (for debugging)
 */
export async function sendTestEvent(eventType: string = 'page_view') {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/live-debug/test-event?event_type=${eventType}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send test event');
  }

  return response.json() as Promise<{status: string; message: string; event: LiveEvent}>;
}


// =====================================================
// AD INSIGHTS ANALYTICS HOOKS (Sprint 7)
// =====================================================

export interface PlatformMetrics {
  platform: string;
  spend_micros: number;
  revenue_micros: number;
  conversions: number;
  impressions: number;
  clicks: number;
  roas: number;
  ctr: number;
  cpc_micros: number;
  cpa_micros: number;
}

export interface CombinedMetrics {
  total_spend_micros: number;
  total_revenue_micros: number;
  total_conversions: number;
  total_impressions: number;
  total_clicks: number;
  blended_roas: number;
  blended_ctr: number;
  blended_cpc_micros: number;
  blended_cpa_micros: number;
}

export interface InsightsTrend {
  date: string;
  google_spend_micros: number;
  meta_spend_micros: number;
  google_conversions: number;
  meta_conversions: number;
  total_spend_micros: number;
  total_conversions: number;
}

export interface InsightsOverview {
  period: string;
  date_from: string;
  date_to: string;
  combined: CombinedMetrics;
  by_platform: PlatformMetrics[];
  trends: InsightsTrend[];
  top_insights: Array<{type: string; message: string; impact: string}>;
}

export interface PlatformComparison {
  period: string;
  google: PlatformMetrics;
  meta: PlatformMetrics;
  winner_by_metric: {
    roas: string;
    cpa: string;
    ctr: string;
    volume: string;
  };
  recommendations: string[];
}

export interface CampaignInsight {
  id: string;
  name: string;
  platform: string;
  type: string;
  status: string;
  spend_micros: number;
  revenue_micros: number;
  conversions: number;
  roas: number;
  ctr: number;
  cpa_micros: number;
  spend_pct: number;
  conversion_pct: number;
}

export interface FunnelMetrics {
  impressions: number;
  clicks: number;
  visits: number;
  leads: number;
  conversions: number;
  impression_to_click_rate: number;
  click_to_visit_rate: number;
  visit_to_lead_rate: number;
  lead_to_conversion_rate: number;
  overall_conversion_rate: number;
}

/**
 * Hook for ad insights overview
 */
export function useAdInsightsOverview(days: number = 30) {
  return useApi<InsightsOverview>(`/api/v1/analytics/insights/overview?days=${days}`);
}

/**
 * Hook for platform comparison
 */
export function usePlatformComparison(days: number = 30) {
  return useApi<PlatformComparison>(`/api/v1/analytics/insights/platform-comparison?days=${days}`);
}

/**
 * Hook for campaign insights
 */
export function useCampaignInsights(options?: {
  days?: number;
  platform?: string;
  sort_by?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.days) params.set('days', String(options.days));
  if (options?.platform) params.set('platform', options.platform);
  if (options?.sort_by) params.set('sort_by', options.sort_by);
  if (options?.limit) params.set('limit', String(options.limit));
  const query = params.toString() ? `?${params}` : '';

  return useApi<{campaigns: CampaignInsight[]; total: number}>(`/api/v1/analytics/insights/campaigns${query}`);
}

/**
 * Hook for funnel analytics
 */
export function useFunnelAnalytics(days: number = 30) {
  return useApi<FunnelMetrics>(`/api/v1/analytics/insights/funnel?days=${days}`);
}


// =====================================================
// CLICK ANALYTICS HOOKS (Sprint 7)
// =====================================================

export interface ClickOverview {
  total_clicks: number;
  unique_visitors: number;
  avg_clicks_per_visitor: number;
  total_conversions: number;
  conversion_rate: number;
  total_spend_micros: number;
  total_revenue_micros: number;
  attributed_conversions: number;
  attribution_rate: number;
}

export interface ChannelPerformance {
  channel: string;
  clicks: number;
  conversions: number;
  revenue_micros: number;
  conversion_rate: number;
  avg_value_micros: number;
  click_share: number;
  conversion_share: number;
}

export interface UTMPerformance {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  clicks: number;
  conversions: number;
  revenue_micros: number;
  conversion_rate: number;
}

export interface ClickIDPerformance {
  click_id_type: string;
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
  total_revenue_micros: number;
}

export interface SourceMediumPerformance {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  conversions: number;
  revenue_micros: number;
  conversion_rate: number;
  channel: string;
}

/**
 * Hook for click analytics overview
 */
export function useClickAnalyticsOverview(days: number = 30) {
  return useApi<ClickOverview>(`/api/v1/analytics/clicks/overview?days=${days}`);
}

/**
 * Hook for channel performance
 */
export function useChannelPerformance(days: number = 30) {
  return useApi<{channels: ChannelPerformance[]}>(`/api/v1/analytics/clicks/channels?days=${days}`);
}

/**
 * Hook for UTM analytics
 */
export function useUTMAnalytics(options?: {
  days?: number;
  group_by?: 'source' | 'medium' | 'campaign' | 'all';
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.days) params.set('days', String(options.days));
  if (options?.group_by) params.set('group_by', options.group_by);
  if (options?.limit) params.set('limit', String(options.limit));
  const query = params.toString() ? `?${params}` : '';

  return useApi<{utm_data: UTMPerformance[]; total: number}>(`/api/v1/analytics/clicks/utm${query}`);
}

/**
 * Hook for click ID analytics
 */
export function useClickIDAnalytics(days: number = 30) {
  return useApi<{click_ids: ClickIDPerformance[]}>(`/api/v1/analytics/clicks/click-ids?days=${days}`);
}

/**
 * Hook for source/medium report (GA4 style)
 */
export function useSourceMediumReport(options?: {
  days?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.days) params.set('days', String(options.days));
  if (options?.limit) params.set('limit', String(options.limit));
  const query = params.toString() ? `?${params}` : '';

  return useApi<{data: SourceMediumPerformance[]; total: number}>(`/api/v1/analytics/clicks/source-medium${query}`);
}


// =====================================================
// PRODUCT ANALYTICS HOOKS (Sprint 7)
// =====================================================

export interface ProductOverview {
  total_products_sold: number;
  total_revenue_micros: number;
  total_orders: number;
  avg_order_value_micros: number;
  unique_products: number;
  top_category: string | null;
  top_brand: string | null;
}

export interface ProductSummary {
  product_id: string;
  product_name: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  quantity_sold: number;
  revenue_micros: number;
  order_count: number;
  avg_price_micros: number;
  revenue_pct: number;
}

export interface CategorySummary {
  category: string;
  product_count: number;
  quantity_sold: number;
  revenue_micros: number;
  avg_price_micros: number;
  revenue_pct: number;
}

export interface BrandSummary {
  brand: string;
  product_count: number;
  quantity_sold: number;
  revenue_micros: number;
  revenue_pct: number;
}

export interface ProductTrend {
  date: string;
  quantity_sold: number;
  revenue_micros: number;
  order_count: number;
}

/**
 * Hook for product analytics overview
 */
export function useProductAnalyticsOverview(days: number = 30) {
  return useApi<ProductOverview>(`/api/v1/analytics/products/overview?days=${days}`);
}

/**
 * Hook for product list
 */
export function useProductList(options?: {
  days?: number;
  category?: string;
  brand?: string;
  sort_by?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.days) params.set('days', String(options.days));
  if (options?.category) params.set('category', options.category);
  if (options?.brand) params.set('brand', options.brand);
  if (options?.sort_by) params.set('sort_by', options.sort_by);
  if (options?.limit) params.set('limit', String(options.limit));
  const query = params.toString() ? `?${params}` : '';

  return useApi<{products: ProductSummary[]; total: number}>(`/api/v1/analytics/products/list${query}`);
}

/**
 * Hook for category performance
 */
export function useCategoryPerformance(days: number = 30, limit: number = 20) {
  return useApi<{categories: CategorySummary[]}>(`/api/v1/analytics/products/categories?days=${days}&limit=${limit}`);
}

/**
 * Hook for brand performance
 */
export function useBrandPerformance(days: number = 30, limit: number = 20) {
  return useApi<{brands: BrandSummary[]}>(`/api/v1/analytics/products/brands?days=${days}&limit=${limit}`);
}

/**
 * Hook for product trends
 */
export function useProductTrends(days: number = 30) {
  return useApi<{trends: ProductTrend[]}>(`/api/v1/analytics/products/trends?days=${days}`);
}

/**
 * Hook for single product detail
 */
export function useProductDetail(productId: string, days: number = 30) {
  return useApi<{
    product_id: string;
    product_name: string;
    sku: string | null;
    category: string | null;
    brand: string | null;
    quantity_sold: number;
    revenue_micros: number;
    order_count: number;
    avg_price_micros: number;
    variants: Array<{variant_id: string; variant_name: string; quantity: number; revenue_micros: number}>;
    daily_sales: ProductTrend[];
  }>(
    `/api/v1/analytics/products/${productId}?days=${days}`,
    { enabled: !!productId }
  );
}


// =====================================================
// SEARCH CONSOLE HOOKS (Sprint 7)
// =====================================================

export interface SearchConsoleProperty {
  id: string;
  site_url: string;
  permission_level: string;
  connected_at: string;
  last_sync: string | null;
}

export interface SearchPerformanceOverview {
  total_clicks: number;
  total_impressions: number;
  average_ctr: number;
  average_position: number;
  clicks_change_pct: number;
  impressions_change_pct: number;
  ctr_change_pct: number;
  position_change: number;
}

export interface QueryPerformance {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface PagePerformance {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface CountryPerformance {
  country: string;
  country_name: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface DevicePerformance {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleTrend {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleDashboard {
  overview: SearchPerformanceOverview;
  trends: SearchConsoleTrend[];
  top_queries: QueryPerformance[];
  top_pages: PagePerformance[];
  by_country: CountryPerformance[];
  by_device: DevicePerformance[];
  search_appearance: Array<{appearance_type: string; clicks: number; impressions: number}>;
}

/**
 * Hook for Search Console properties
 */
export function useSearchConsoleProperties() {
  return useApi<SearchConsoleProperty[]>('/api/v1/analytics/search-console/properties');
}

/**
 * Hook for Search Console dashboard
 */
export function useSearchConsoleDashboard(propertyId?: string, days: number = 28) {
  const params = new URLSearchParams();
  if (propertyId) params.set('property_id', propertyId);
  params.set('days', String(days));
  return useApi<SearchConsoleDashboard>(`/api/v1/analytics/search-console/dashboard?${params}`);
}

/**
 * Hook for query report
 */
export function useSearchConsoleQueries(options?: {
  property_id?: string;
  days?: number;
  limit?: number;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (options?.property_id) params.set('property_id', options.property_id);
  if (options?.days) params.set('days', String(options.days));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.search) params.set('search', options.search);
  const query = params.toString() ? `?${params}` : '';

  return useApi<{queries: QueryPerformance[]; total_queries: number; date_range: string}>(`/api/v1/analytics/search-console/queries${query}`);
}

/**
 * Hook for page report
 */
export function useSearchConsolePages(options?: {
  property_id?: string;
  days?: number;
  limit?: number;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (options?.property_id) params.set('property_id', options.property_id);
  if (options?.days) params.set('days', String(options.days));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.search) params.set('search', options.search);
  const query = params.toString() ? `?${params}` : '';

  return useApi<{pages: PagePerformance[]; total_pages: number; date_range: string}>(`/api/v1/analytics/search-console/pages${query}`);
}


// =====================================================
// GA4 SERVER-SIDE EVENTS HOOKS (Sprint 7)
// =====================================================

export interface GA4Status {
  configured: boolean;
  measurement_id: string | null;
}

/**
 * Hook for GA4 configuration status
 */
export function useGA4Status() {
  return useApi<GA4Status>('/api/v1/ga4/status');
}

/**
 * Configure GA4 for organization
 */
export async function configureGA4(measurementId: string, apiSecret: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/ga4/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ measurement_id: measurementId, api_secret: apiSecret }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to configure GA4');
  }

  return response.json();
}

/**
 * Send GA4 event
 */
export async function sendGA4Event(
  clientId: string,
  eventName: string,
  params?: Record<string, unknown>,
  userId?: string
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/ga4/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      event_name: eventName,
      params,
      user_id: userId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send event');
  }

  return response.json();
}

/**
 * Track GA4 conversion
 */
export async function trackGA4Conversion(
  clientId: string,
  conversionName: string,
  value?: number,
  currency?: string,
  transactionId?: string,
  userId?: string
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/ga4/conversion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      conversion_name: conversionName,
      value,
      currency: currency || 'USD',
      transaction_id: transactionId,
      user_id: userId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to track conversion');
  }

  return response.json();
}

/**
 * Track GA4 purchase
 */
export async function trackGA4Purchase(data: {
  client_id: string;
  transaction_id: string;
  value: number;
  currency?: string;
  items?: Array<{item_id: string; item_name: string; price: number; quantity: number}>;
  coupon?: string;
  shipping?: number;
  tax?: number;
  user_id?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/ga4/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      currency: data.currency || 'USD',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to track purchase');
  }

  return response.json();
}

/**
 * Validate GA4 event (debug mode)
 */
export async function validateGA4Event(eventName: string, params?: Record<string, unknown>) {
  const paramsStr = params ? `&params=${encodeURIComponent(JSON.stringify(params))}` : '';
  const response = await fetch(`${API_BASE_URL}/api/v1/ga4/validate?event_name=${encodeURIComponent(eventName)}${paramsStr}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to validate event');
  }

  return response.json();
}


// =====================================================
// AD GOALS & ALERTS HOOKS (Sprint 8)
// =====================================================

export interface AdGoal {
  id: string;
  name: string;
  description: string | null;
  metric: string;
  target_value: number;
  current_value: number;
  progress_pct: number;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  period_start: string;
  period_end: string;
  ad_account_id: string | null;
  platform: string | null;
  campaign_id: string | null;
  is_active: boolean;
  status: 'not_started' | 'in_progress' | 'on_track' | 'at_risk' | 'behind' | 'achieved' | 'failed';
  last_updated_at: string;
  created_at: string;
}

export interface AdAlert {
  id: string;
  name: string;
  description: string | null;
  metric: string;
  condition: 'above' | 'below' | 'increases_by' | 'decreases_by' | 'equals';
  threshold: number;
  time_window: 'hour' | 'day' | 'week' | 'month';
  check_frequency: 'hourly' | 'daily';
  ad_account_id: string | null;
  platform: string | null;
  campaign_id: string | null;
  notification_channels: string[];
  is_active: boolean;
  is_muted: boolean;
  muted_until: string | null;
  cooldown_minutes: number;
  max_alerts_per_day: number;
  alerts_today: number;
  last_triggered_at: string | null;
  last_checked_at: string | null;
  created_at: string;
}

export interface AlertHistoryEntry {
  id: string;
  alert_id: string;
  alert_name: string;
  metric: string;
  condition: string;
  threshold: number;
  triggered_value: number;
  previous_value: number | null;
  change_pct: number | null;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  notification_channels: string[];
  notification_sent: boolean;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved: boolean;
  resolved_at: string | null;
  triggered_at: string;
}

export interface BudgetPacing {
  id: string;
  name: string | null;
  ad_account_id: string | null;
  platform: string | null;
  campaign_id: string | null;
  period: string;
  monthly_budget_micros: number;
  total_spent_micros: number;
  daily_target_micros: number;
  current_pacing_pct: number;
  ideal_pacing_pct: number;
  status: 'on_track' | 'over_pace' | 'under_pace' | 'critical_over' | 'critical_under';
  alert_threshold_pct: number;
  days_remaining: number;
  projected_spend_micros: number;
  last_updated_at: string;
  created_at: string;
}

export interface GoalsAlertsSummary {
  total_goals: number;
  achieved_goals: number;
  at_risk_goals: number;
  in_progress_goals: number;
  active_alerts: number;
  unread_alerts: number;
  alerts_triggered_today: number;
  budget_pacing: {
    on_track: number;
    over_pace: number;
    under_pace: number;
    critical: number;
  };
  top_goals: Array<{
    id: string;
    name: string;
    metric: string;
    progress_pct: number;
    status: string;
    days_remaining: number;
  }>;
  recent_alerts: AlertHistoryEntry[];
}

/**
 * Hook for goals list
 */
export function useGoals(filters?: {
  status?: string;
  metric?: string;
  platform?: string;
  is_active?: boolean;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.metric) params.set('metric', filters.metric);
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active));
  if (filters?.limit) params.set('limit', String(filters.limit));
  const query = params.toString() ? `?${params}` : '';

  return useApi<{ goals: AdGoal[]; total: number }>(`/api/v1/goals${query}`);
}

/**
 * Hook for single goal
 */
export function useGoal(goalId: string) {
  return useApi<AdGoal>(`/api/v1/goals/${goalId}`, {
    enabled: !!goalId,
  });
}

/**
 * Hook for goal progress
 */
export function useGoalProgress(goalId: string) {
  return useApi<{
    goal_id: string;
    name: string;
    metric: string;
    target_value: number;
    current_value: number;
    progress_pct: number;
    status: string;
    period_start: string;
    period_end: string;
    days_elapsed: number;
    days_total: number;
    days_remaining: number;
    daily_avg_needed: number;
    current_daily_avg: number;
    on_track: boolean;
    history: Array<{ date: string; value: number }>;
  }>(
    `/api/v1/goals/${goalId}/progress`,
    { enabled: !!goalId }
  );
}

/**
 * Create a goal
 */
export async function createGoal(data: {
  name: string;
  description?: string;
  metric: string;
  target_value: number;
  period_type: string;
  period_start: string;
  period_end: string;
  ad_account_id?: string;
  platform?: string;
  campaign_id?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create goal');
  }

  return response.json() as Promise<AdGoal>;
}

/**
 * Update a goal
 */
export async function updateGoal(goalId: string, data: Partial<AdGoal>) {
  const response = await fetch(`${API_BASE_URL}/api/v1/goals/${goalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update goal');
  }

  return response.json() as Promise<AdGoal>;
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/goals/${goalId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete goal');
  }

  return response.json();
}

/**
 * Hook for alerts list
 */
export function useAlerts(filters?: {
  is_active?: boolean;
  is_muted?: boolean;
  metric?: string;
  platform?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active));
  if (filters?.is_muted !== undefined) params.set('is_muted', String(filters.is_muted));
  if (filters?.metric) params.set('metric', filters.metric);
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const query = params.toString() ? `?${params}` : '';

  return useApi<{ alerts: AdAlert[]; total: number }>(`/api/v1/goals/alerts${query}`);
}

/**
 * Create an alert
 */
export async function createAlert(data: {
  name: string;
  description?: string;
  metric: string;
  condition: string;
  threshold: number;
  time_window?: string;
  check_frequency?: string;
  ad_account_id?: string;
  platform?: string;
  campaign_id?: string;
  notification_channels?: string[];
  cooldown_minutes?: number;
  max_alerts_per_day?: number;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/goals/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create alert');
  }

  return response.json() as Promise<AdAlert>;
}

/**
 * Update an alert
 */
export async function updateAlert(alertId: string, data: Partial<AdAlert>) {
  const response = await fetch(`${API_BASE_URL}/api/v1/goals/alerts/${alertId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update alert');
  }

  return response.json() as Promise<AdAlert>;
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/goals/alerts/${alertId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete alert');
  }

  return response.json();
}

/**
 * Mute an alert
 */
export async function muteAlert(alertId: string, hours: number = 24) {
  const response = await fetch(`${API_BASE_URL}/api/v1/goals/alerts/${alertId}/mute?hours=${hours}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to mute alert');
  }

  return response.json();
}

/**
 * Unmute an alert
 */
export async function unmuteAlert(alertId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/goals/alerts/${alertId}/unmute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to unmute alert');
  }

  return response.json();
}

/**
 * Hook for alert history
 */
export function useAlertHistory(filters?: {
  alert_id?: string;
  acknowledged?: boolean;
  resolved?: boolean;
  severity?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.alert_id) params.set('alert_id', filters.alert_id);
  if (filters?.acknowledged !== undefined) params.set('acknowledged', String(filters.acknowledged));
  if (filters?.resolved !== undefined) params.set('resolved', String(filters.resolved));
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));
  const query = params.toString() ? `?${params}` : '';

  return useApi<{ history: AlertHistoryEntry[]; total: number; unread: number }>(`/api/v1/goals/alerts/history${query}`);
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(historyId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/goals/alerts/history/${historyId}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to acknowledge alert');
  }

  return response.json();
}

/**
 * Resolve an alert
 */
export async function resolveAlert(historyId: string, notes?: string) {
  const params = notes ? `?notes=${encodeURIComponent(notes)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/v1/goals/alerts/history/${historyId}/resolve${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to resolve alert');
  }

  return response.json();
}

/**
 * Hook for budget pacing
 */
export function useBudgetPacing(filters?: {
  platform?: string;
  status?: string;
  period?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.period) params.set('period', filters.period);
  const query = params.toString() ? `?${params}` : '';

  return useApi<{ pacing: BudgetPacing[]; total: number }>(`/api/v1/goals/budget-pacing${query}`);
}

/**
 * Create budget pacing
 */
export async function createBudgetPacing(data: {
  name?: string;
  ad_account_id?: string;
  platform?: string;
  campaign_id?: string;
  monthly_budget_micros: number;
  period?: string;
  alert_threshold_pct?: number;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/goals/budget-pacing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create budget pacing');
  }

  return response.json() as Promise<BudgetPacing>;
}

/**
 * Hook for goals & alerts summary (dashboard widget)
 */
export function useGoalsAlertsSummary() {
  return useApi<GoalsAlertsSummary>('/api/v1/goals/summary');
}
