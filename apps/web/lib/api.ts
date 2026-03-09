/**
 * API Client for AdsMaster Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

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

export interface AffectedEntity {
  type: string;
  id: string;
  name: string;
  campaign_id?: string;
  campaign_name?: string;
}

export interface RecommendationOption {
  id: number;
  label: string;
  action: string;
  description: string;
  risk: string;
}

export interface ImpactEstimate {
  monthly_savings: number | null;
  potential_gain: number | null;
  summary: string;
}

export interface Recommendation {
  id: string;
  ad_account_id: string;
  organization_id: string;
  rule_id: string;
  type: string;
  severity: 'critical' | 'warning' | 'opportunity' | 'info';
  title: string;
  description: string;
  impact_estimate: ImpactEstimate;
  affected_entity: AffectedEntity;
  options: RecommendationOption[];
  status: 'pending' | 'applied' | 'dismissed' | 'expired';
  confidence: number;
  expires_at: string;
  created_at: string;
  applied_at?: string;
  applied_option_id?: number;
  dismissed_at?: string;
  dismiss_reason?: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  total: number;
  pending: number;
  applied: number;
  dismissed: number;
  total_savings: number;
  total_potential_gain: number;
}

export interface RecommendationSummary {
  total: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  total_savings: number;
  total_potential_gain: number;
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

// Auth - Google Ads
export function getGoogleAdsConnectUrl(organizationId: string): string {
  return `${API_BASE_URL}/auth/google-ads/connect?organization_id=${organizationId}`;
}

// Auth - Meta Ads
export function getMetaAdsConnectUrl(organizationId: string): string {
  return `${API_BASE_URL}/auth/meta/connect?organization_id=${organizationId}`;
}

export async function getMetaAccounts(organizationId: string) {
  return fetchApi<Array<{
    account_id: string;
    name: string;
    status: string;
    currency: string;
    timezone: string;
    business_id?: string;
    business_name?: string;
    amount_spent: number;
  }>>(`/auth/meta/accounts?organization_id=${organizationId}`);
}

export async function disconnectMetaAccount(accountId: string) {
  return fetchApi<{ success: boolean; message: string }>(
    `/auth/meta/disconnect/${accountId}`,
    { method: 'DELETE' }
  );
}

// Meta Campaigns
export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  created_time: string;
  updated_time: string;
}

export interface MetaInsights {
  date_start: string;
  date_stop: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cost_per_conversion: number | null;
  reach: number;
  frequency: number;
}

export async function getMetaCampaigns(accountId: string, params?: { status?: string; objective?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.objective) searchParams.set('objective', params.objective);
  const query = searchParams.toString() ? `?${searchParams}` : '';
  return fetchApi<{ campaigns: MetaCampaign[]; total: number }>(
    `/api/v1/meta/accounts/${accountId}/campaigns${query}`
  );
}

export async function getMetaCampaign(accountId: string, campaignId: string) {
  return fetchApi<MetaCampaign>(`/api/v1/meta/accounts/${accountId}/campaigns/${campaignId}`);
}

export async function getMetaCampaignInsights(
  accountId: string,
  campaignId: string,
  datePreset: string = 'last_30d'
) {
  return fetchApi<MetaInsights>(
    `/api/v1/meta/accounts/${accountId}/campaigns/${campaignId}/insights?date_preset=${datePreset}`
  );
}

export async function pauseMetaCampaign(accountId: string, campaignId: string) {
  return fetchApi<{ success: boolean; message: string }>(
    `/api/v1/meta/accounts/${accountId}/campaigns/${campaignId}/pause`,
    { method: 'POST' }
  );
}

export async function enableMetaCampaign(accountId: string, campaignId: string) {
  return fetchApi<{ success: boolean; message: string }>(
    `/api/v1/meta/accounts/${accountId}/campaigns/${campaignId}/enable`,
    { method: 'POST' }
  );
}

export async function getMetaAccountSummary(accountId: string) {
  return fetchApi<{
    account_id: string;
    total_campaigns: number;
    active_campaigns: number;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    avg_ctr: number;
    avg_cpc: number;
    cost_per_conversion: number | null;
  }>(`/api/v1/meta/accounts/${accountId}/summary`);
}

// Recommendations
export async function getRecommendations(params?: {
  account_id?: string;
  severity?: string;
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.account_id) searchParams.set('account_id', params.account_id);
  if (params?.severity) searchParams.set('severity', params.severity);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  const query = searchParams.toString() ? `?${searchParams}` : '';
  return fetchApi<RecommendationsResponse>(`/api/v1/recommendations${query}`);
}

export async function getRecommendationsSummary(accountId?: string) {
  const query = accountId ? `?account_id=${accountId}` : '';
  return fetchApi<RecommendationSummary>(`/api/v1/recommendations/summary${query}`);
}

export async function applyRecommendation(recommendationId: string, optionId: number) {
  return fetchApi<{
    success: boolean;
    recommendation_id: string;
    action_taken: string;
    message: string;
    can_undo: boolean;
    undo_expires_at?: string;
  }>(`/api/v1/recommendations/${recommendationId}/apply`, {
    method: 'POST',
    body: JSON.stringify({ option_id: optionId }),
  });
}

export async function dismissRecommendation(recommendationId: string, reason?: string) {
  return fetchApi<{
    success: boolean;
    recommendation_id: string;
    message: string;
  }>(`/api/v1/recommendations/${recommendationId}/dismiss`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function undoRecommendation(recommendationId: string) {
  return fetchApi<{
    success: boolean;
    recommendation_id: string;
    message: string;
    reverted_action: string;
  }>(`/api/v1/recommendations/${recommendationId}/undo`, {
    method: 'POST',
  });
}

export async function bulkApplyRecommendations(recommendationIds: string[], optionId: number) {
  return fetchApi<{
    success: boolean;
    results: Array<{ id: string; success: boolean; action?: string; error?: string }>;
    applied_count: number;
  }>(`/api/v1/recommendations/bulk/apply?option_id=${optionId}`, {
    method: 'POST',
    body: JSON.stringify(recommendationIds),
  });
}

export async function bulkDismissRecommendations(recommendationIds: string[], reason?: string) {
  return fetchApi<{
    success: boolean;
    results: Array<{ id: string; success: boolean; error?: string }>;
    dismissed_count: number;
  }>(`/api/v1/recommendations/bulk/dismiss${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, {
    method: 'POST',
    body: JSON.stringify(recommendationIds),
  });
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
