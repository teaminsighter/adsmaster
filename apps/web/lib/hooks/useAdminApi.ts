'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

export async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));

    // Handle token expiration - redirect to login
    if (response.status === 401) {
      // Clear invalid tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
        localStorage.removeItem('admin_user');
        // Redirect to login
        window.location.href = '/admin/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

interface UseAdminApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminApi<T>(endpoint: string, enabled: boolean = true): UseAdminApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await adminFetch<T>(endpoint);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================================================
// Dashboard
// ============================================================================

export interface DashboardMetrics {
  total_users: number;
  total_organizations: number;
  total_ad_accounts: number;
  new_users_7d: number;
  active_users_30d: number;
  total_api_calls_today: number;
  total_ai_tokens_today: number;
  ai_cost_today_usd: number;
  timestamp: string;
}

export function useAdminDashboard() {
  return useAdminApi<DashboardMetrics>('/admin/dashboard');
}

export interface RecentActivity {
  activities: Array<{
    id: string;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    created_at: string;
    admin_user_id: string;
  }>;
}

export function useRecentActivity(limit: number = 20) {
  return useAdminApi<RecentActivity>(`/admin/dashboard/recent-activity?limit=${limit}`);
}

// ============================================================================
// Users
// ============================================================================

export interface UserListResponse {
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    is_active: boolean;
    created_at: string;
    last_login_at: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function useAdminUsers(page: number = 1, search: string = '', status: string = '') {
  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  return useAdminApi<UserListResponse>(`/admin/users?${params}`);
}

export async function suspendUser(userId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/users/${userId}/suspend`, { method: 'POST' });
}

export async function activateUser(userId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/users/${userId}/activate`, { method: 'POST' });
}

export interface UserDetail {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    is_active: boolean;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
  };
  memberships: Array<{
    role: string;
    organization_id: string;
    organizations: {
      name: string;
      plan: string;
    } | null;
  }>;
}

export function useUserDetail(userId: string) {
  return useAdminApi<UserDetail>(`/admin/users/${userId}`, !!userId);
}

// ============================================================================
// Organizations
// ============================================================================

export interface OrganizationListResponse {
  organizations: Array<{
    id: string;
    name: string;
    plan: string;
    created_at: string;
  }>;
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function useAdminOrganizations(page: number = 1, search: string = '', plan: string = '') {
  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (search) params.set('search', search);
  if (plan) params.set('plan', plan);
  return useAdminApi<OrganizationListResponse>(`/admin/organizations?${params}`);
}

export async function updateOrganizationPlan(orgId: string, plan: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/organizations/${orgId}/subscription?plan=${plan}`, { method: 'PATCH' });
}

export interface OrganizationDetail {
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    created_at: string;
    updated_at: string;
  };
  members: Array<{
    user_id: string;
    role: string;
    users: {
      email: string;
      name: string | null;
    } | null;
  }>;
  ad_accounts: Array<{
    id: string;
    platform: string;
    external_account_id: string;
    name: string;
    status: string;
    token_status: string;
    last_sync_at: string | null;
    created_at: string;
  }>;
  subscription: {
    id: string;
    plan_name: string;
    status: string;
    billing_interval: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  } | null;
}

export function useOrganizationDetail(orgId: string) {
  return useAdminApi<OrganizationDetail>(`/admin/organizations/${orgId}`, !!orgId);
}

// ============================================================================
// Analytics
// ============================================================================

export interface AnalyticsOverview {
  period_days: number;
  user_signups: Record<string, number>;
  total_signups: number;
}

export function useAnalyticsOverview(days: number = 30) {
  return useAdminApi<AnalyticsOverview>(`/admin/analytics/overview?days=${days}`);
}

export interface PageViewAnalytics {
  total_views: number;
  top_pages: Array<{ page: string; views: number }>;
  views_by_date: Record<string, number>;
}

export function usePageViewAnalytics(days: number = 7) {
  return useAdminApi<PageViewAnalytics>(`/admin/analytics/page-views?days=${days}`);
}

// ============================================================================
// API Usage
// ============================================================================

export interface ApiUsageStats {
  total_requests: number;
  error_count: number;
  error_rate: number;
  avg_response_time_ms: number;
  by_endpoint: Record<string, number>;
  by_status: Record<string, number>;
}

export function useApiUsage(days: number = 7) {
  return useAdminApi<ApiUsageStats>(`/admin/api-usage?days=${days}`);
}

// ============================================================================
// AI Usage
// ============================================================================

export interface AiUsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  by_provider: Record<string, { requests: number; tokens: number; cost: number }>;
  by_date: Record<string, { requests: number; tokens: number; cost: number }>;
}

export function useAiUsage(days: number = 7) {
  return useAdminApi<AiUsageStats>(`/admin/ai-usage?days=${days}`);
}

// ============================================================================
// Config
// ============================================================================

export interface SystemConfig {
  configs: Array<{
    key: string;
    value: any;
    description: string | null;
    is_secret: boolean;
    updated_at: string;
  }>;
}

export function useSystemConfig() {
  return useAdminApi<SystemConfig>('/admin/config');
}

export async function updateConfig(key: string, value: any): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/config/${key}?value=${encodeURIComponent(JSON.stringify(value))}`, { method: 'PUT' });
}

// ============================================================================
// Audit Logs
// ============================================================================

export interface AuditLogsResponse {
  logs: Array<{
    id: string;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    old_value: unknown;
    new_value: unknown;
    ip_address: string | null;
    created_at: string;
    admin_users: { email: string; name: string | null } | null;
  }>;
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function useAuditLogs(page: number = 1, action: string = '', resourceType: string = '') {
  const params = new URLSearchParams({ page: page.toString(), limit: '50' });
  if (action) params.set('action', action);
  if (resourceType) params.set('resource_type', resourceType);
  return useAdminApi<AuditLogsResponse>(`/admin/audit-logs?${params}`);
}

// ============================================================================
// Billing & Revenue
// ============================================================================

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  total_revenue: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  past_due_subscriptions: number;
  cancelled_subscriptions: number;
  churn_rate: number;
  arpu: number;
  monthly_revenue: Array<{ month: string; revenue: number }>;
  by_plan: Record<string, { count: number; mrr: number }>;
  timestamp: string;
}

export function useRevenueMetrics(days: number = 30) {
  return useAdminApi<RevenueMetrics>(`/admin/billing/revenue?days=${days}`);
}

export interface Subscription {
  id: string;
  organization_id: string;
  organizations: { name: string; slug: string };
  plan_name: string;
  status: string;
  billing_interval: string;
  mrr: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface SubscriptionsResponse {
  subscriptions: Subscription[];
  total: number;
  page: number;
  limit: number;
}

export function useSubscriptions(page: number = 1, status: string = '', plan: string = '') {
  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (status) params.set('status', status);
  if (plan) params.set('plan', plan);
  return useAdminApi<SubscriptionsResponse>(`/admin/billing/subscriptions?${params}`);
}

export interface Invoice {
  id: string;
  invoice_number: string;
  organization_id: string;
  organizations: { name: string };
  status: string;
  total_cents: number;
  amount_paid_cents: number;
  amount_due_cents: number;
  amount_refunded_cents?: number;
  currency: string;
  invoice_date: string;
  paid_at: string | null;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
}

export function useInvoices(page: number = 1, status: string = '') {
  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (status) params.set('status', status);
  return useAdminApi<InvoicesResponse>(`/admin/billing/invoices?${params}`);
}

export async function refundInvoice(invoiceId: string, amountCents?: number): Promise<{ success: boolean; message: string }> {
  const params = amountCents ? `?amount_cents=${amountCents}` : '';
  return adminFetch(`/admin/billing/invoices/${invoiceId}/refund${params}`, { method: 'POST' });
}

export interface FailedPayment {
  id: string;
  organization_id: string;
  organizations: { name: string; slug: string };
  invoices: { invoice_number: string } | null;
  amount_cents: number;
  currency: string;
  failure_code: string;
  failure_message: string;
  retry_count: number;
  last_retry_at: string | null;
  next_retry_at: string | null;
  created_at: string;
}

export interface FailedPaymentsResponse {
  failed_payments: FailedPayment[];
  total: number;
  page: number;
  limit: number;
}

export function useFailedPayments(page: number = 1) {
  return useAdminApi<FailedPaymentsResponse>(`/admin/billing/failed-payments?page=${page}`);
}

export async function retryFailedPayment(paymentId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/billing/failed-payments/${paymentId}/retry`, { method: 'POST' });
}

// ============================================================================
// Coupons
// ============================================================================

export interface Coupon {
  id: string;
  code: string;
  name: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  duration: 'once' | 'repeating' | 'forever';
  duration_in_months?: number;
  max_redemptions: number | null;
  redemption_count: number;
  applies_to_plans: string[] | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CouponsResponse {
  coupons: Coupon[];
  total: number;
  page: number;
  limit: number;
}

export function useCoupons(page: number = 1, activeOnly: boolean = false) {
  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (activeOnly) params.set('active_only', 'true');
  return useAdminApi<CouponsResponse>(`/admin/billing/coupons?${params}`);
}

export interface CreateCouponData {
  code: string;
  name?: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  duration?: 'once' | 'repeating' | 'forever';
  duration_in_months?: number;
  max_redemptions?: number;
  applies_to_plans?: string[];
  valid_until?: string;
}

export async function createCoupon(data: CreateCouponData): Promise<{ success: boolean; coupon: Coupon; message?: string }> {
  return adminFetch('/admin/billing/coupons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deactivateCoupon(couponId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/billing/coupons/${couponId}`, { method: 'DELETE' });
}

// ============================================================================
// Subscription Plans
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_ad_accounts: number;
  max_users: number;
  features: Record<string, unknown>;
  is_active: boolean;
  is_popular: boolean;
}

export interface PlansResponse {
  plans: SubscriptionPlan[];
}

export function usePlans() {
  return useAdminApi<PlansResponse>('/admin/billing/plans');
}

export async function updatePlan(
  planId: string,
  data: { price_monthly?: number; price_yearly?: number; is_active?: boolean }
): Promise<{ success: boolean; message: string }> {
  const params = new URLSearchParams();
  if (data.price_monthly !== undefined) params.set('price_monthly', data.price_monthly.toString());
  if (data.price_yearly !== undefined) params.set('price_yearly', data.price_yearly.toString());
  if (data.is_active !== undefined) params.set('is_active', data.is_active.toString());
  return adminFetch(`/admin/billing/plans/${planId}?${params}`, { method: 'PATCH' });
}

// ============================================================================
// Ad Accounts
// ============================================================================

export interface AdAccount {
  id: string;
  organization_id: string;
  organizations: { name: string; plan: string } | null;
  platform: string;
  external_account_id: string;
  name: string;
  status: string;
  token_status: string;
  currency: string;
  timezone: string;
  last_sync_at: string | null;
  created_at: string;
}

export interface AdAccountsResponse {
  ad_accounts: AdAccount[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function useAdAccounts(
  page: number = 1,
  platform: string = '',
  status: string = '',
  tokenStatus: string = '',
  search: string = ''
) {
  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (platform) params.set('platform', platform);
  if (status) params.set('status', status);
  if (tokenStatus) params.set('token_status', tokenStatus);
  if (search) params.set('search', search);
  return useAdminApi<AdAccountsResponse>(`/admin/ad-accounts?${params}`);
}

export interface TokenHealthSummary {
  total_accounts: number;
  healthy_percentage: number;
  by_status: {
    valid: number;
    expiring: number;
    expired: number;
    unknown: number;
  };
  by_platform: {
    google: { total: number; healthy: number };
    meta: { total: number; healthy: number };
  };
  needs_attention: number;
  timestamp: string;
}

export function useTokenHealth() {
  return useAdminApi<TokenHealthSummary>('/admin/ad-accounts/token-health');
}

export interface ExpiringAccount {
  id: string;
  organization_id: string;
  organizations: { name: string; slug: string } | null;
  platform: string;
  name: string;
  token_status: string;
  token_expires_at: string | null;
  external_account_id: string;
}

export interface ExpiringAccountsResponse {
  accounts: ExpiringAccount[];
  total: number;
}

export function useExpiringTokens(days: number = 7) {
  return useAdminApi<ExpiringAccountsResponse>(`/admin/ad-accounts/expiring?days=${days}`);
}

export async function forceSyncAccount(accountId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/ad-accounts/${accountId}/sync`, { method: 'POST' });
}

// ============================================================================
// Marketing Analytics
// ============================================================================

export interface MarketingOverview {
  period_days: number;
  landing_page_visits: number;
  unique_visitors: number;
  signups: number;
  signup_rate: number;
  paid_conversions: number;
  paid_rate: number;
  visits_trend: number;
  timestamp: string;
}

export function useMarketingOverview(days: number = 30) {
  return useAdminApi<MarketingOverview>(`/admin/marketing/overview?days=${days}`);
}

export interface TrafficSourcesResponse {
  sources: Array<{
    source: string;
    visitors: number;
    signups: number;
    conversion_rate: number;
    paid_conversions: number;
  }>;
  period_days: number;
}

export function useTrafficSources(days: number = 30) {
  return useAdminApi<TrafficSourcesResponse>(`/admin/marketing/traffic-sources?days=${days}`);
}

export interface FunnelResponse {
  funnel: Array<{
    step: string;
    label: string;
    count: number;
    percentage: number;
    drop_off_rate: number;
  }>;
  period_days: number;
}

export function useConversionFunnel(days: number = 30) {
  return useAdminApi<FunnelResponse>(`/admin/marketing/funnel?days=${days}`);
}

export interface SignupMethodsResponse {
  methods: Array<{
    method: string;
    count: number;
    percentage: number;
    paid_conversion_rate: number;
  }>;
  total: number;
  period_days: number;
}

export function useSignupMethods(days: number = 30) {
  return useAdminApi<SignupMethodsResponse>(`/admin/marketing/signup-methods?days=${days}`);
}

// ============================================================================
// AI & ML Control
// ============================================================================

export interface AIOverview {
  today: { requests: number; tokens: number; cost: number };
  week: { requests: number; tokens: number; cost: number };
  month: { requests: number; tokens: number; cost: number };
  by_provider: Record<string, { requests: number; tokens: number; cost: number }>;
  timestamp: string;
}

export function useAIOverview() {
  return useAdminApi<AIOverview>('/admin/ai/overview');
}

export interface AIModelConfig {
  id: string;
  feature: string;
  provider: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  priority: number;
}

export interface AIModelsResponse {
  models: AIModelConfig[];
}

export function useAIModels(feature?: string) {
  const params = feature ? `?feature=${feature}` : '';
  return useAdminApi<AIModelsResponse>(`/admin/ai/models${params}`);
}

export interface AIPrompt {
  id: string;
  name: string;
  feature: string;
  version: number;
  system_prompt: string;
  user_prompt_template: string | null;
  is_active: boolean;
  is_production: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface AIPromptsResponse {
  prompts: AIPrompt[];
}

export function useAIPrompts(feature?: string) {
  const params = feature ? `?feature=${feature}` : '';
  return useAdminApi<AIPromptsResponse>(`/admin/ai/prompts${params}`);
}

export interface RecommendationRule {
  id: string;
  rule_type: string;
  name: string;
  description: string;
  is_enabled: boolean;
  priority: number;
  thresholds: Record<string, unknown>;
  min_confidence_score: number;
  require_approval: boolean;
}

export interface RecommendationRulesResponse {
  rules: RecommendationRule[];
}

export function useRecommendationRules() {
  return useAdminApi<RecommendationRulesResponse>('/admin/ai/recommendation-rules');
}

export interface AIBudget {
  id: string;
  scope_type: string;
  scope_id: string | null;
  daily_budget_usd: number;
  monthly_budget_usd: number;
  current_daily_spend: number;
  current_monthly_spend: number;
  alert_at_percentage: number;
}

export interface AIBudgetsResponse {
  budgets: AIBudget[];
}

export function useAIBudgets() {
  return useAdminApi<AIBudgetsResponse>('/admin/ai/budgets');
}

// ============================================================================
// API Monitor
// ============================================================================

export interface APIVersion {
  platform: string;
  current_version: string;
  latest_version: string;
  production_adapter_version: string;
  api_status: string;
  error_rate_24h: number;
  avg_latency_ms: number;
}

export interface APIVersionsResponse {
  platforms: APIVersion[];
}

export function useAPIVersions() {
  return useAdminApi<APIVersionsResponse>('/admin/api-monitor/versions');
}

export interface APIHealthResponse {
  platforms: Array<{
    platform: string;
    current_version: string;
    latest_version: string;
    production_adapter: string;
    status: string;
    error_rate_1h: number;
    avg_latency_ms: number;
    requests_1h: number;
  }>;
  timestamp: string;
}

export function useAPIHealth() {
  return useAdminApi<APIHealthResponse>('/admin/api-monitor/health');
}

export interface APIAlert {
  id: string;
  platform: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface APIAlertsResponse {
  alerts: APIAlert[];
  total: number;
  page: number;
  limit: number;
}

export function useAPIAlerts(acknowledged?: boolean) {
  const params = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : '';
  return useAdminApi<APIAlertsResponse>(`/admin/api-monitor/alerts${params}`);
}

export interface SunsetTimelineResponse {
  timeline: Array<{
    platform: string;
    version: string;
    sunset_date: string;
    days_until: number;
    urgency: string;
  }>;
}

export function useSunsetTimeline() {
  return useAdminApi<SunsetTimelineResponse>('/admin/api-monitor/sunset-timeline');
}

// ============================================================================
// System
// ============================================================================

export interface SystemOverview {
  maintenance_mode: boolean;
  active_feature_flags: number;
  unacknowledged_alerts: number;
  jobs_today: { pending: number; running: number; completed: number; failed: number };
  timestamp: string;
}

export function useSystemOverview() {
  return useAdminApi<SystemOverview>('/admin/system/overview');
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  is_enabled: boolean;
  rollout_percentage: number;
  target_plans: string[] | null;
  updated_at: string;
}

export interface FeatureFlagsResponse {
  flags: FeatureFlag[];
}

export function useFeatureFlags() {
  return useAdminApi<FeatureFlagsResponse>('/admin/system/feature-flags');
}

export async function toggleFeatureFlag(flagName: string): Promise<{ success: boolean; is_enabled: boolean }> {
  return adminFetch(`/admin/system/feature-flags/${flagName}/toggle`, { method: 'POST' });
}

export interface BackgroundJob {
  id: string;
  job_type: string;
  job_name: string;
  status: string;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface BackgroundJobsResponse {
  jobs: BackgroundJob[];
  total: number;
  page: number;
  limit: number;
}

export function useBackgroundJobs(status?: string, jobType?: string, page: number = 1) {
  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (status) params.set('status', status);
  if (jobType) params.set('job_type', jobType);
  return useAdminApi<BackgroundJobsResponse>(`/admin/system/jobs?${params}`);
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  severity: string;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

export interface AnnouncementsResponse {
  announcements: Announcement[];
  total: number;
  page: number;
  limit: number;
}

export function useAnnouncements(activeOnly: boolean = false, page: number = 1) {
  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (activeOnly) params.set('active_only', 'true');
  return useAdminApi<AnnouncementsResponse>(`/admin/system/announcements?${params}`);
}

export interface SecurityEventsResponse {
  events: Array<{
    id: string;
    event_type: string;
    severity: string;
    user_id: string | null;
    ip_address: string;
    description: string;
    created_at: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

export function useSecurityEvents(days: number = 7, page: number = 1) {
  return useAdminApi<SecurityEventsResponse>(`/admin/system/security-events?days=${days}&page=${page}`);
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminUsersResponse {
  admins: AdminUser[];
}

export function useSystemAdmins() {
  return useAdminApi<AdminUsersResponse>('/admin/system/admins');
}

export interface MaintenanceStatus {
  is_active: boolean;
  active_windows: Array<{
    id: string;
    message: string;
    actual_start: string;
  }>;
  scheduled_windows: Array<{
    id: string;
    message: string;
    scheduled_start: string;
    scheduled_end: string;
  }>;
  history: Array<{
    id: string;
    reason: string;
    actual_start: string;
    actual_end: string;
  }>;
}

export function useMaintenanceStatus() {
  return useAdminApi<MaintenanceStatus>('/admin/system/maintenance');
}

export async function setMaintenanceMode(
  enabled: boolean,
  message: string
): Promise<{ success: boolean; maintenance_mode: boolean }> {
  return adminFetch('/admin/system/maintenance', {
    method: 'POST',
    body: JSON.stringify({ enabled, message }),
  });
}

// ============================================================================
// Enhanced User Management
// ============================================================================

export interface UserStats {
  total: number;
  active: number;
  new_this_week: number;
  suspended: number;
  unverified: number;
  at_risk: number;
  timestamp: string;
}

export function useUserStats() {
  return useAdminApi<UserStats>('/admin/users/stats');
}

export interface EnhancedUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  organization: string | null;
  organization_id: string | null;
  role: string | null;
  plan: string;
  ad_accounts_count: number;
  signup_method?: string;
}

export interface EnhancedUsersResponse {
  users: EnhancedUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface UserFilters {
  search?: string;
  status?: string;
  plan?: string;
  signup_date?: string;
  last_active?: string;
  has_ad_account?: boolean;
  signup_method?: string;
  sort_by?: string;
  sort_order?: string;
}

export function useEnhancedUsers(page: number = 1, filters: UserFilters = {}) {
  const params = new URLSearchParams({ page: page.toString(), limit: '20' });
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.plan) params.set('plan', filters.plan);
  if (filters.signup_date) params.set('signup_date', filters.signup_date);
  if (filters.last_active) params.set('last_active', filters.last_active);
  if (filters.has_ad_account !== undefined) params.set('has_ad_account', String(filters.has_ad_account));
  if (filters.signup_method) params.set('signup_method', filters.signup_method);
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.sort_order) params.set('sort_order', filters.sort_order);
  return useAdminApi<EnhancedUsersResponse>(`/admin/users/enhanced?${params}`);
}

export interface UserActivity {
  type: string;
  description: string;
  ip_address?: string;
  device?: string;
  resource_id?: string;
  created_at: string;
}

export interface UserActivityResponse {
  user_id: string;
  activities: UserActivity[];
}

export function useUserActivity(userId: string, limit: number = 50) {
  return useAdminApi<UserActivityResponse>(`/admin/users/${userId}/activity?limit=${limit}`, !!userId);
}

export interface UserNote {
  id: string;
  user_id: string;
  content: string;
  admin_users: { email: string; name: string | null } | null;
  created_at: string;
}

export interface UserNotesResponse {
  notes: UserNote[];
}

export function useUserNotes(userId: string) {
  return useAdminApi<UserNotesResponse>(`/admin/users/${userId}/notes`, !!userId);
}

export async function addUserNote(userId: string, content: string): Promise<{ success: boolean; note: UserNote }> {
  return adminFetch(`/admin/users/${userId}/notes?content=${encodeURIComponent(content)}`, { method: 'POST' });
}

export async function impersonateUser(userId: string): Promise<{
  success: boolean;
  token: string;
  user: { id: string; email: string; name: string | null };
  expires_in: number;
}> {
  return adminFetch(`/admin/users/${userId}/impersonate`, { method: 'POST' });
}

export async function bulkSuspendUsers(userIds: string[]): Promise<{ success: boolean; count: number }> {
  const params = userIds.map(id => `user_ids=${id}`).join('&');
  return adminFetch(`/admin/users/bulk-suspend?${params}`, { method: 'POST' });
}

export async function bulkActivateUsers(userIds: string[]): Promise<{ success: boolean; count: number }> {
  const params = userIds.map(id => `user_ids=${id}`).join('&');
  return adminFetch(`/admin/users/bulk-activate?${params}`, { method: 'POST' });
}

export async function resetUserPassword(userId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/users/${userId}/reset-password`, { method: 'POST' });
}

export async function deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/users/${userId}`, { method: 'DELETE' });
}

export async function exportUsers(format: 'csv' | 'json' = 'csv', filters?: string): Promise<{
  success: boolean;
  message: string;
  format: string;
  estimated_records: number;
}> {
  const params = new URLSearchParams({ format });
  if (filters) params.set('filters', filters);
  return adminFetch(`/admin/users/export?${params}`, { method: 'POST' });
}

// ============================================================================
// Email Templates & Logs
// ============================================================================

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  variables: string[];
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplatesResponse {
  templates: EmailTemplate[];
  total: number;
  page: number;
  limit: number;
}

export function useEmailTemplates(
  page: number = 1,
  category?: string,
  isActive?: boolean
) {
  const params = new URLSearchParams({ page: page.toString(), limit: '50' });
  if (category) params.set('category', category);
  if (isActive !== undefined) params.set('is_active', String(isActive));
  return useAdminApi<EmailTemplatesResponse>(`/admin/emails/templates?${params}`);
}

export function useEmailTemplate(templateId: string) {
  return useAdminApi<{ template: EmailTemplate }>(`/admin/emails/templates/${templateId}`, !!templateId);
}

export interface CreateTemplateData {
  name: string;
  slug: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables?: string[];
  category?: string;
}

export async function createEmailTemplate(data: CreateTemplateData): Promise<{
  success: boolean;
  template: EmailTemplate;
}> {
  return adminFetch('/admin/emails/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface UpdateTemplateData {
  name?: string;
  slug?: string;
  subject?: string;
  html_content?: string;
  text_content?: string;
  variables?: string[];
  category?: string;
  is_active?: boolean;
}

export async function updateEmailTemplate(
  templateId: string,
  data: UpdateTemplateData
): Promise<{ success: boolean; template: EmailTemplate }> {
  return adminFetch(`/admin/emails/templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteEmailTemplate(templateId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/emails/templates/${templateId}`, { method: 'DELETE' });
}

export async function duplicateEmailTemplate(templateId: string): Promise<{
  success: boolean;
  template: EmailTemplate;
}> {
  return adminFetch(`/admin/emails/templates/${templateId}/duplicate`, { method: 'POST' });
}

export interface SendTestEmailData {
  template_id: string;
  to_email: string;
  variables?: Record<string, string>;
}

export async function sendTestEmail(data: SendTestEmailData): Promise<{
  success: boolean;
  message: string;
  message_id?: string;
}> {
  return adminFetch('/admin/emails/send-test', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface SendCustomEmailData {
  to_email: string;
  subject: string;
  html_content: string;
  text_content?: string;
}

export async function sendCustomEmail(data: SendCustomEmailData): Promise<{
  success: boolean;
  message: string;
  message_id?: string;
}> {
  return adminFetch('/admin/emails/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface EmailLog {
  id: string;
  template_id: string | null;
  recipient_email: string;
  recipient_user_id: string | null;
  subject: string;
  status: 'sent' | 'delivered' | 'bounced' | 'failed';
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string;
  delivered_at: string | null;
}

export interface EmailLogsResponse {
  logs: EmailLog[];
  total: number;
  page: number;
  limit: number;
}

export function useEmailLogs(
  page: number = 1,
  status?: string,
  templateId?: string,
  recipient?: string
) {
  const params = new URLSearchParams({ page: page.toString(), limit: '50' });
  if (status) params.set('status', status);
  if (templateId) params.set('template_id', templateId);
  if (recipient) params.set('recipient', recipient);
  return useAdminApi<EmailLogsResponse>(`/admin/emails/logs?${params}`);
}

export interface EmailStats {
  stats: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
    delivery_rate: number;
  };
  period_hours: number;
}

export function useEmailStats(hours: number = 24) {
  return useAdminApi<EmailStats>(`/admin/emails/stats?hours=${hours}`);
}

export interface EmailStatsByTemplate {
  stats: Array<{
    template_id: string | null;
    template_name: string;
    template_slug: string | null;
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
  }>;
}

export function useEmailStatsByTemplate() {
  return useAdminApi<EmailStatsByTemplate>('/admin/emails/stats/by-template');
}

export interface EmailAutomationRule {
  id: string;
  name: string;
  trigger_event: string;
  template_id: string;
  is_enabled: boolean;
  delay_minutes: number;
  conditions: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  email_templates?: {
    name: string;
    slug: string;
  };
}

export interface EmailAutomationRulesResponse {
  rules: EmailAutomationRule[];
}

export function useEmailAutomationRules() {
  return useAdminApi<EmailAutomationRulesResponse>('/admin/emails/automation-rules');
}

export async function toggleEmailAutomationRule(
  ruleId: string,
  isEnabled: boolean
): Promise<{ success: boolean; rule: EmailAutomationRule }> {
  return adminFetch(`/admin/emails/automation-rules/${ruleId}?is_enabled=${isEnabled}`, {
    method: 'PATCH',
  });
}

export interface ScheduledEmail {
  id: string;
  template_id: string;
  recipient_email: string;
  recipient_user_id: string | null;
  variables: Record<string, string>;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'cancelled';
  created_at: string;
  email_templates?: {
    name: string;
    slug: string;
  };
}

export interface ScheduledEmailsResponse {
  emails: ScheduledEmail[];
  total: number;
  page: number;
  limit: number;
}

export function useScheduledEmails(page: number = 1, status?: string) {
  const params = new URLSearchParams({ page: page.toString(), limit: '50' });
  if (status) params.set('status', status);
  return useAdminApi<ScheduledEmailsResponse>(`/admin/emails/scheduled?${params}`);
}

export async function cancelScheduledEmail(emailId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/emails/scheduled/${emailId}/cancel`, { method: 'POST' });
}

// ============================================================================
// Webhook Logs
// ============================================================================

export interface WebhookLog {
  id: string;
  provider: string;
  event_type: string;
  event_id: string;
  payload: Record<string, unknown>;
  status: 'received' | 'processing' | 'processed' | 'failed' | 'skipped';
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  retry_count: number;
  organization_id: string | null;
  subscription_id: string | null;
  invoice_id: string | null;
  received_at: string;
  processed_at: string | null;
  created_at: string;
}

export interface WebhookLogsResponse {
  logs: WebhookLog[];
  total: number;
  page: number;
  limit: number;
}

export function useWebhookLogs(
  page: number = 1,
  provider?: string,
  eventType?: string,
  status?: string
) {
  const params = new URLSearchParams({ page: page.toString(), limit: '50' });
  if (provider) params.set('provider', provider);
  if (eventType) params.set('event_type', eventType);
  if (status) params.set('status', status);
  return useAdminApi<WebhookLogsResponse>(`/admin/webhooks/logs?${params}`);
}

export function useWebhookLogDetail(logId: string) {
  return useAdminApi<{ log: WebhookLog }>(`/admin/webhooks/logs/${logId}`, !!logId);
}

export async function retryWebhook(logId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/admin/webhooks/logs/${logId}/retry`, { method: 'POST' });
}

export interface WebhookStats {
  total: number;
  by_provider: Record<string, number>;
  by_status: {
    received: number;
    processed: number;
    failed: number;
    skipped: number;
  };
  by_event_type: Record<string, number>;
  success_rate: number;
}

export function useWebhookStats(hours: number = 24) {
  return useAdminApi<WebhookStats>(`/admin/webhooks/stats?hours=${hours}`);
}

export interface WebhookEventTypesResponse {
  [provider: string]: string[];
}

export function useWebhookEventTypes() {
  return useAdminApi<WebhookEventTypesResponse>('/admin/webhooks/event-types');
}

export interface SubscriptionEvent {
  id: string;
  subscription_id: string;
  organization_id: string;
  event_type: string;
  status_before: string | null;
  status_after: string | null;
  plan_before: string | null;
  plan_after: string | null;
  mrr_delta_cents: number;
  triggered_by: string;
  webhook_log_id: string | null;
  admin_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SubscriptionEventsResponse {
  events: SubscriptionEvent[];
  total: number;
  page: number;
  limit: number;
}

export function useSubscriptionEvents(
  page: number = 1,
  subscriptionId?: string,
  organizationId?: string,
  eventType?: string
) {
  const params = new URLSearchParams({ page: page.toString(), limit: '50' });
  if (subscriptionId) params.set('subscription_id', subscriptionId);
  if (organizationId) params.set('organization_id', organizationId);
  if (eventType) params.set('event_type', eventType);
  return useAdminApi<SubscriptionEventsResponse>(`/admin/webhooks/subscription-events?${params}`);
}
