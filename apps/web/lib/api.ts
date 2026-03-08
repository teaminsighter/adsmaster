/**
 * API Client for AdsMaster Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.detail || 'Request failed' };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: 'Network error' };
  }
}

// =============================================================================
// Types
// =============================================================================

export interface AdAccount {
  id: string;
  organization_id: string;
  platform: string;
  external_account_id: string;
  name: string;
  currency_code: string;
  timezone: string;
  status: string;
  token_status: string;
  last_sync_at: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  external_campaign_id: string;
  name: string;
  status: string;
  campaign_type: string;
  budget_micros: number | null;
  budget_type: string | null;
  currency_code: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface CampaignMetrics {
  campaign_id: string;
  date_from: string;
  date_to: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
  ctr: number | null;
  avg_cpc_micros: number | null;
  avg_cpa_micros: number | null;
  roas: number | null;
}

export interface AccountStats {
  account_id: string;
  campaigns_count: number;
  active_campaigns: number;
  total_spend_30d: number;
  total_conversions_30d: number;
}

export interface SyncStatus {
  account_id: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  sync_in_progress: boolean;
}

// =============================================================================
// API Functions
// =============================================================================

// Accounts
export async function getAccounts(organizationId: string) {
  return fetchApi<{ accounts: AdAccount[]; total: number }>(
    `/accounts?organization_id=${organizationId}`
  );
}

export async function getAccount(accountId: string) {
  return fetchApi<AdAccount>(`/accounts/${accountId}`);
}

export async function getAccountStats(accountId: string) {
  return fetchApi<AccountStats>(`/accounts/${accountId}/stats`);
}

export async function disconnectAccount(accountId: string) {
  return fetchApi<{ success: boolean }>(`/accounts/${accountId}`, {
    method: 'DELETE',
  });
}

// Campaigns
export async function getCampaigns(accountId: string, status?: string) {
  const params = status ? `?status=${status}` : '';
  return fetchApi<{ campaigns: Campaign[]; total: number }>(
    `/accounts/${accountId}/campaigns${params}`
  );
}

export async function getCampaign(accountId: string, campaignId: string) {
  return fetchApi<Campaign>(`/accounts/${accountId}/campaigns/${campaignId}`);
}

export async function getCampaignMetrics(
  accountId: string,
  campaignId: string,
  dateFrom?: string,
  dateTo?: string
) {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  const query = params.toString() ? `?${params}` : '';
  return fetchApi<CampaignMetrics>(
    `/accounts/${accountId}/campaigns/${campaignId}/metrics${query}`
  );
}

export async function pauseCampaign(accountId: string, campaignId: string) {
  return fetchApi<{ success: boolean; message: string }>(
    `/accounts/${accountId}/campaigns/${campaignId}/pause`,
    { method: 'POST' }
  );
}

export async function enableCampaign(accountId: string, campaignId: string) {
  return fetchApi<{ success: boolean; message: string }>(
    `/accounts/${accountId}/campaigns/${campaignId}/enable`,
    { method: 'POST' }
  );
}

// Sync
export async function getSyncStatus(accountId: string) {
  return fetchApi<SyncStatus>(`/sync/status/${accountId}`);
}

export async function triggerSync(accountId: string, syncType: string = 'full') {
  return fetchApi<{ success: boolean; message: string; sync_id: string }>(
    `/sync/trigger/${accountId}?sync_type=${syncType}`,
    { method: 'POST' }
  );
}

// Auth
export function getGoogleAdsConnectUrl(organizationId: string): string {
  return `${API_BASE_URL}/auth/google-ads/connect?organization_id=${organizationId}`;
}

// =============================================================================
// Utility Functions
// =============================================================================

export function formatMicros(micros: number, currency: string = 'USD'): string {
  const amount = micros / 1_000_000;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercent(num: number): string {
  return `${num.toFixed(2)}%`;
}

export function formatChange(current: number, previous: number): { value: string; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0) return { value: '—', direction: 'neutral' };
  const change = ((current - previous) / previous) * 100;
  return {
    value: `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%`,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
  };
}
