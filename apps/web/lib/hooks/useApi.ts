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
