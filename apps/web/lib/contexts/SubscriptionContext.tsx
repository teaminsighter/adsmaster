'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

// Subscription tiers ordered by feature access level
export type SubscriptionTier = 'free' | 'starter' | 'growth' | 'agency' | 'enterprise';

// Feature definitions with required tier
export interface FeatureGate {
  sessionRecordings: SubscriptionTier;
  liveDebug: SubscriptionTier;
  firstPartyDomains: SubscriptionTier;
  crmIntegrations: SubscriptionTier;
  studioBuilder: SubscriptionTier;
  searchConsole: SubscriptionTier;
  ga4Analytics: SubscriptionTier;
  webhooks: SubscriptionTier;
  whiteLabel: SubscriptionTier;
  apiAccess: SubscriptionTier;
  mlForecasting: SubscriptionTier;
}

// Feature tier requirements
export const FEATURE_GATES: FeatureGate = {
  sessionRecordings: 'growth',
  liveDebug: 'starter',
  firstPartyDomains: 'growth',
  crmIntegrations: 'agency',
  studioBuilder: 'agency',
  searchConsole: 'growth',
  ga4Analytics: 'growth',
  webhooks: 'growth',
  whiteLabel: 'agency',
  apiAccess: 'agency',
  mlForecasting: 'growth',
};

// Tier limits
export interface TierLimits {
  adAccounts: number;
  aiMessagesPerMonth: number;
  conversionsPerMonth: number;
  sessionRecordingsPerMonth: number;
  dashboards: number;
  domains: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    adAccounts: 1,
    aiMessagesPerMonth: 50,
    conversionsPerMonth: 100,
    sessionRecordingsPerMonth: 0,
    dashboards: 0,
    domains: 0,
  },
  starter: {
    adAccounts: 2,
    aiMessagesPerMonth: 200,
    conversionsPerMonth: 500,
    sessionRecordingsPerMonth: 0,
    dashboards: 0,
    domains: 0,
  },
  growth: {
    adAccounts: 5,
    aiMessagesPerMonth: 1000,
    conversionsPerMonth: 2000,
    sessionRecordingsPerMonth: 100,
    dashboards: 0,
    domains: 1,
  },
  agency: {
    adAccounts: 25,
    aiMessagesPerMonth: 5000,
    conversionsPerMonth: 10000,
    sessionRecordingsPerMonth: 1000,
    dashboards: 5,
    domains: 5,
  },
  enterprise: {
    adAccounts: -1, // Unlimited
    aiMessagesPerMonth: -1,
    conversionsPerMonth: -1,
    sessionRecordingsPerMonth: -1,
    dashboards: -1,
    domains: -1,
  },
};

interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'none';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: TierLimits;
  usage: {
    adAccounts: number;
    aiMessages: number;
    conversions: number;
    sessionRecordings: number;
    dashboards: number;
    domains: number;
  };
}

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  error: string | null;
  tier: SubscriptionTier;
  hasFeature: (feature: keyof FeatureGate) => boolean;
  hasTierAccess: (requiredTier: SubscriptionTier) => boolean;
  isWithinLimit: (resource: keyof TierLimits) => boolean;
  getLimit: (resource: keyof TierLimits) => number;
  getUsage: (resource: keyof TierLimits) => number;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

// Tier order for comparison
const TIER_ORDER: SubscriptionTier[] = ['free', 'starter', 'growth', 'agency', 'enterprise'];

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default tier when not loaded
  const tier = subscription?.tier || 'free';

  // Check if user has access to a specific tier
  const hasTierAccess = useCallback((requiredTier: SubscriptionTier): boolean => {
    const currentIndex = TIER_ORDER.indexOf(tier);
    const requiredIndex = TIER_ORDER.indexOf(requiredTier);
    return currentIndex >= requiredIndex;
  }, [tier]);

  // Check if user has access to a specific feature
  const hasFeature = useCallback((feature: keyof FeatureGate): boolean => {
    const requiredTier = FEATURE_GATES[feature];
    return hasTierAccess(requiredTier);
  }, [hasTierAccess]);

  // Check if user is within usage limits
  const isWithinLimit = useCallback((resource: keyof TierLimits): boolean => {
    if (!subscription) return false;
    const limit = subscription.limits[resource];
    if (limit === -1) return true; // Unlimited
    const usage = subscription.usage[resource as keyof typeof subscription.usage] || 0;
    return usage < limit;
  }, [subscription]);

  // Get limit for a resource
  const getLimit = useCallback((resource: keyof TierLimits): number => {
    return subscription?.limits[resource] ?? TIER_LIMITS.free[resource];
  }, [subscription]);

  // Get usage for a resource
  const getUsage = useCallback((resource: keyof TierLimits): number => {
    return subscription?.usage[resource as keyof typeof subscription.usage] ?? 0;
  }, [subscription]);

  // Fetch subscription info
  const fetchSubscription = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/settings/billing`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // For demo or when billing isn't set up, default to agency tier
        setSubscription({
          tier: 'agency', // Demo mode: full access
          status: 'active',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          limits: TIER_LIMITS.agency,
          usage: {
            adAccounts: 2,
            aiMessages: 150,
            conversions: 500,
            sessionRecordings: 25,
            dashboards: 1,
            domains: 0,
          },
        });
        setError(null);
        return;
      }

      const data = await response.json();

      // Map API response to subscription info
      const tierFromApi = (data.subscription_tier || 'free').toLowerCase() as SubscriptionTier;
      setSubscription({
        tier: tierFromApi,
        status: data.subscription_status || 'none',
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        limits: TIER_LIMITS[tierFromApi],
        usage: {
          adAccounts: data.usage?.ad_accounts || 0,
          aiMessages: data.usage?.ai_messages || 0,
          conversions: data.usage?.conversions || 0,
          sessionRecordings: data.usage?.session_recordings || 0,
          dashboards: data.usage?.dashboards || 0,
          domains: data.usage?.domains || 0,
        },
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      // Default to agency tier for demo
      setSubscription({
        tier: 'agency',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        limits: TIER_LIMITS.agency,
        usage: {
          adAccounts: 2,
          aiMessages: 150,
          conversions: 500,
          sessionRecordings: 25,
          dashboards: 1,
          domains: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  // Fetch on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        error,
        tier,
        hasFeature,
        hasTierAccess,
        isWithinLimit,
        getLimit,
        getUsage,
        refresh: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// Hook to use subscription context
export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Hook for feature-gated content
export function useFeatureGate(feature: keyof FeatureGate) {
  const { hasFeature, tier } = useSubscription();
  const requiredTier = FEATURE_GATES[feature];
  const hasAccess = hasFeature(feature);

  return {
    hasAccess,
    requiredTier,
    currentTier: tier,
  };
}
