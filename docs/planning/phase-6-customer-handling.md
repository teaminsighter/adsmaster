# Phase 6: Customer Handling Plan

## Executive Summary

| Area | Approach | Tools |
|------|----------|-------|
| **Onboarding** | Guided wizard, progressive | Custom + Gemini |
| **Billing** | Stripe Billing | Stripe |
| **Support** | Help center + AI chat | Intercom / custom |
| **Email** | Transactional + marketing | SendGrid / Resend |
| **WhatsApp** | Alerts & notifications | Twilio / WhatsApp Business |
| **Analytics** | Customer health tracking | Custom + Mixpanel |

---

## Customer Journey Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CUSTOMER LIFECYCLE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

ACQUISITION                    ACTIVATION                      RETENTION
┌────────────┐                ┌────────────┐                  ┌────────────┐
│  Landing   │───────────────►│  Signup &  │──────────────────►│   Active   │
│   Page     │                │  Onboarding │                  │    User    │
└────────────┘                └────────────┘                  └────────────┘
     │                              │                               │
     │ • SEO/Ads                    │ • Email verify                │ • Daily use
     │ • Referrals                  │ • Connect account             │ • AI chat
     │ • Content                    │ • First audit                 │ • Apply recs
     │                              │ • Choose plan                 │ • Reports
     ▼                              ▼                               ▼
┌────────────┐                ┌────────────┐                  ┌────────────┐
│   Free     │───────────────►│   Trial    │──────────────────►│   Paid     │
│   Audit    │   (upgrade)    │  (14 days) │    (convert)     │  Customer  │
└────────────┘                └────────────┘                  └────────────┘
                                    │                               │
                                    │ (no convert)                  │ (churn)
                                    ▼                               ▼
                              ┌────────────┐                  ┌────────────┐
                              │   Churned  │                  │   Win-back │
                              │  (free)    │◄─────────────────│  Campaign  │
                              └────────────┘                  └────────────┘
```

---

## 1. Onboarding Flow

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ONBOARDING FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: SIGNUP
┌────────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │  Email +     │───►│   Verify     │───►│  Create      │                  │
│  │  Password    │    │   Email      │    │  Profile     │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                            OR                                               │
│  ┌──────────────┐                        ┌──────────────┐                  │
│  │   Google     │───────────────────────►│  Create      │                  │
│  │   OAuth      │                        │  Profile     │                  │
│  └──────────────┘                        └──────────────┘                  │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
STEP 2: BUSINESS INFO (30 seconds)
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  "Tell us about your business"                                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Business Type: [E-commerce ▼]                                       │  │
│  │  Industry:      [Fashion & Apparel ▼]                                │  │
│  │  Monthly Spend: [$1,000 - $5,000 ▼]                                  │  │
│  │  Experience:    [I run my own ads ▼]                                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  This helps us tailor recommendations to your business                      │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
STEP 3: CONNECT AD ACCOUNT
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  "Connect your Google Ads account"                                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  🔗 Connect Google Ads                                               │  │
│  │                                                                      │  │
│  │  We'll analyze your account and find optimization opportunities      │  │
│  │                                                                      │  │
│  │  ✓ Read-only access initially                                        │  │
│  │  ✓ Your data stays private                                          │  │
│  │  ✓ Disconnect anytime                                               │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [Skip for now - use demo data]                                             │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
STEP 4: FIRST AUDIT (AI-powered, ~2 minutes)
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  "Analyzing your account..."                                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  ████████████████████████░░░░░░░░ 75%                               │  │
│  │                                                                      │  │
│  │  ✓ Synced 5 campaigns                                               │  │
│  │  ✓ Analyzed 234 keywords                                            │  │
│  │  ✓ Found 12 wasting keywords                                        │  │
│  │  → Calculating health score...                                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Estimated savings found: $240/month                                        │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
STEP 5: AUDIT RESULTS + PLAN SELECTION
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  "Your Account Health Score: 62/100"                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  ISSUES FOUND:                                                       │  │
│  │  • 12 keywords wasting $180/mo (fixable in 1 click)                 │  │
│  │  • 5 campaigns without conversion tracking                          │  │
│  │  • 23 search terms to add as negatives                              │  │
│  │  • Budget not optimized across campaigns                            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  To fix these issues and unlock AI optimization:                            │
│                                                                             │
│  [ FREE: Keep audit only ]  [ GROWTH: $99/mo - Start free trial ]          │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
STEP 6: NOTIFICATION PREFERENCES
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  "How should we alert you?"                                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  [✓] Email alerts (critical issues)                                  │  │
│  │  [ ] WhatsApp alerts (instant notifications)                        │  │
│  │  [✓] Weekly summary email                                           │  │
│  │  [✓] In-app notifications                                           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [Complete Setup →]                                                         │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Onboarding Checklist (Displayed in Dashboard)

```tsx
// Onboarding checklist component
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: string;
  href: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "connect_account",
    title: "Connect your ad account",
    description: "Link Google Ads to start analyzing",
    completed: false,
    action: "Connect",
    href: "/accounts/connect",
  },
  {
    id: "first_audit",
    title: "Review your first audit",
    description: "See optimization opportunities",
    completed: false,
    action: "View",
    href: "/reports/initial-audit",
  },
  {
    id: "apply_recommendation",
    title: "Apply your first recommendation",
    description: "Fix an issue with one click",
    completed: false,
    action: "Apply",
    href: "/ai",
  },
  {
    id: "ask_ai",
    title: "Ask the AI advisor a question",
    description: "Get insights in plain English",
    completed: false,
    action: "Chat",
    href: "/ai/chat",
  },
  {
    id: "setup_alerts",
    title: "Set up alerts",
    description: "Get notified about issues",
    completed: false,
    action: "Setup",
    href: "/settings/notifications",
  },
];
```

---

## 2. Subscription Plans & Billing

### Plan Structure

```yaml
plans:
  # Free tier - Lead generation
  free_audit:
    name: "Free Audit"
    price: 0
    features:
      max_ad_accounts: 1
      max_campaigns: 10
      ai_chat_messages: 50/month
      recommendations: "view only"
      auto_apply: false
      reports: "initial audit only"
      whatsapp_alerts: false
      support: "community"
    billing: null

  # Starter - Small businesses
  starter:
    name: "Starter"
    price_monthly: 49
    price_yearly: 468  # $39/mo
    features:
      max_ad_accounts: 2
      max_campaigns: 50
      ai_chat_messages: 500/month
      recommendations: "approve + apply"
      auto_apply: false
      reports: "weekly + monthly"
      whatsapp_alerts: true
      support: "email"
    trial_days: 14

  # Growth - Growing businesses
  growth:
    name: "Growth"
    price_monthly: 99
    price_yearly: 948  # $79/mo
    features:
      max_ad_accounts: 5
      max_campaigns: 200
      ai_chat_messages: "unlimited"
      recommendations: "approve + apply"
      auto_apply: true  # Automation rules
      reports: "all + custom"
      whatsapp_alerts: true
      support: "priority email + chat"
    trial_days: 14

  # Agency - Agencies managing clients
  agency:
    name: "Agency"
    price_monthly: 249
    price_yearly: 2388  # $199/mo
    base_clients: 5
    per_client_monthly: 29
    features:
      max_ad_accounts: "unlimited"
      max_campaigns: "unlimited"
      ai_chat_messages: "unlimited"
      recommendations: "all features"
      auto_apply: true
      reports: "white-labeled"
      whatsapp_alerts: true
      client_portal: true
      api_access: true
      support: "dedicated manager"
    trial_days: 14

  # Enterprise - Custom
  enterprise:
    name: "Enterprise"
    price: "custom"
    features:
      everything_in_agency: true
      custom_integrations: true
      sla: "99.9%"
      dedicated_support: true
      custom_ml_models: true
      on_premise_option: true
    contact_sales: true
```

### Stripe Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BILLING FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

NEW SUBSCRIPTION
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Select  │────►│  Enter   │────►│  Stripe  │────►│ Active   │
│   Plan   │     │  Payment │     │ Checkout │     │ Customer │
└──────────┘     └──────────┘     └──────────┘     └──────────┘

UPGRADE/DOWNGRADE
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Select  │────►│  Prorate │────►│  Active  │
│ New Plan │     │  Billing │     │ New Plan │
└──────────┘     └──────────┘     └──────────┘

CANCELLATION
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Request  │────►│  Exit    │────►│ End of   │────►│  Free    │
│  Cancel  │     │ Interview│     │  Period  │     │   Tier   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘

PAYMENT FAILURE
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Payment  │────►│  Retry   │────►│  Grace   │────►│ Suspend  │
│  Failed  │     │ (3x)     │     │ Period   │     │ Account  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                   (7 days)         (notify user)
```

### Billing Implementation

```python
# app/services/billing_service.py
from stripe import Subscription, Customer, Invoice
from app.config import settings
from app.core.exceptions import BillingError

class BillingService:
    """Handle all billing operations via Stripe."""

    PLAN_PRICE_IDS = {
        "starter_monthly": "price_xxx1",
        "starter_yearly": "price_xxx2",
        "growth_monthly": "price_xxx3",
        "growth_yearly": "price_xxx4",
        "agency_monthly": "price_xxx5",
        "agency_yearly": "price_xxx6",
    }

    async def create_subscription(
        self,
        organization_id: str,
        plan: str,
        billing_cycle: str,  # "monthly" | "yearly"
        payment_method_id: str
    ) -> dict:
        """Create new subscription with trial."""
        org = await self.org_repo.get(organization_id)

        # Create or get Stripe customer
        if not org.stripe_customer_id:
            customer = await stripe_client.create_customer(
                email=org.billing_email,
                name=org.name,
                organization_id=organization_id
            )
            org.stripe_customer_id = customer.id
            await self.org_repo.update(organization_id, {
                "stripe_customer_id": customer.id
            })

        # Create subscription
        price_id = self.PLAN_PRICE_IDS[f"{plan}_{billing_cycle}"]
        subscription = await stripe_client.create_subscription(
            customer_id=org.stripe_customer_id,
            price_id=price_id,
            payment_method_id=payment_method_id
        )

        # Store subscription
        await self.subscription_repo.create({
            "organization_id": organization_id,
            "plan_id": plan,
            "stripe_subscription_id": subscription["subscription_id"],
            "status": subscription["status"],
            "current_period_start": subscription["current_period_start"],
            "current_period_end": subscription["current_period_end"]
        })

        return subscription

    async def change_plan(
        self,
        organization_id: str,
        new_plan: str,
        billing_cycle: str
    ) -> dict:
        """Upgrade or downgrade plan with proration."""
        subscription = await self.subscription_repo.get_active(organization_id)

        new_price_id = self.PLAN_PRICE_IDS[f"{new_plan}_{billing_cycle}"]

        # Stripe handles proration automatically
        updated = await stripe_client.update_subscription(
            subscription_id=subscription.stripe_subscription_id,
            new_price_id=new_price_id,
            proration_behavior="create_prorations"
        )

        await self.subscription_repo.update(subscription.id, {
            "plan_id": new_plan,
            "current_period_start": updated.current_period_start,
            "current_period_end": updated.current_period_end
        })

        return updated

    async def cancel_subscription(
        self,
        organization_id: str,
        reason: str,
        feedback: str
    ) -> dict:
        """Cancel at end of period."""
        subscription = await self.subscription_repo.get_active(organization_id)

        # Store cancellation feedback
        await self.cancellation_repo.create({
            "organization_id": organization_id,
            "reason": reason,
            "feedback": feedback,
            "plan": subscription.plan_id
        })

        # Cancel at period end (user keeps access until then)
        await stripe_client.cancel_subscription(
            subscription.stripe_subscription_id,
            at_period_end=True
        )

        await self.subscription_repo.update(subscription.id, {
            "cancel_at_period_end": True
        })

        return {
            "message": "Subscription will be cancelled at end of billing period",
            "access_until": subscription.current_period_end
        }

    async def handle_payment_failure(
        self,
        stripe_subscription_id: str
    ):
        """Handle failed payment webhook."""
        subscription = await self.subscription_repo.get_by_stripe_id(
            stripe_subscription_id
        )

        # Update status
        await self.subscription_repo.update(subscription.id, {
            "status": "past_due"
        })

        # Send notification
        await self.notification_service.send(
            user_id=subscription.organization.owner_id,
            type="payment_failed",
            channels=["email", "in_app"],
            data={
                "update_payment_url": "/billing/payment-methods",
                "grace_period_ends": "7 days"
            }
        )

    async def handle_subscription_ended(
        self,
        stripe_subscription_id: str
    ):
        """Handle subscription cancellation/expiry."""
        subscription = await self.subscription_repo.get_by_stripe_id(
            stripe_subscription_id
        )

        # Downgrade to free tier
        await self.subscription_repo.update(subscription.id, {
            "status": "cancelled",
            "plan_id": "free_audit"
        })

        # Disable premium features
        await self.feature_service.disable_premium_features(
            subscription.organization_id
        )
```

---

## 3. Email Communications

### Transactional Emails

```yaml
emails:
  # Onboarding sequence
  welcome:
    trigger: "user.created"
    delay: 0
    subject: "Welcome to AdsMaster - Let's optimize your ads"
    template: "welcome.html"

  verify_email:
    trigger: "user.created"
    delay: 0
    subject: "Verify your email address"
    template: "verify-email.html"

  onboarding_reminder_1:
    trigger: "user.created"
    delay: "24h"
    condition: "!account_connected"
    subject: "Complete your setup - Connect your Google Ads"
    template: "onboarding-reminder.html"

  onboarding_reminder_2:
    trigger: "user.created"
    delay: "72h"
    condition: "!account_connected"
    subject: "We found $X savings waiting for you"
    template: "onboarding-savings.html"

  first_audit_ready:
    trigger: "audit.completed"
    delay: 0
    subject: "Your account audit is ready - Score: {score}/100"
    template: "audit-ready.html"

  # Trial emails
  trial_started:
    trigger: "subscription.trial_started"
    delay: 0
    subject: "Your 14-day free trial has started"
    template: "trial-started.html"

  trial_day_7:
    trigger: "subscription.trial_started"
    delay: "7d"
    subject: "7 days left in your trial - Here's what you've achieved"
    template: "trial-halfway.html"

  trial_day_12:
    trigger: "subscription.trial_started"
    delay: "12d"
    subject: "Your trial ends in 2 days"
    template: "trial-ending.html"

  trial_ended:
    trigger: "subscription.trial_ended"
    delay: 0
    subject: "Your trial has ended - Don't lose your savings"
    template: "trial-ended.html"

  # Subscription emails
  subscription_created:
    trigger: "subscription.created"
    delay: 0
    subject: "Welcome to {plan_name} - Your subscription is active"
    template: "subscription-active.html"

  payment_successful:
    trigger: "invoice.paid"
    delay: 0
    subject: "Payment received - Receipt #{invoice_number}"
    template: "payment-receipt.html"

  payment_failed:
    trigger: "invoice.payment_failed"
    delay: 0
    subject: "Action required: Payment failed"
    template: "payment-failed.html"

  subscription_cancelled:
    trigger: "subscription.cancelled"
    delay: 0
    subject: "We're sorry to see you go"
    template: "subscription-cancelled.html"

  # Regular emails
  weekly_summary:
    trigger: "cron.weekly"
    day: "monday"
    time: "09:00"
    subject: "Your weekly performance summary"
    template: "weekly-summary.html"

  monthly_report:
    trigger: "cron.monthly"
    day: 1
    time: "09:00"
    subject: "Your {month} performance report"
    template: "monthly-report.html"

  # Alert emails
  critical_alert:
    trigger: "alert.critical"
    delay: 0
    subject: "⚠️ Critical: {alert_title}"
    template: "alert-critical.html"

  # Win-back emails
  winback_day_7:
    trigger: "subscription.cancelled"
    delay: "7d"
    subject: "We've made improvements - Come back?"
    template: "winback-7d.html"

  winback_day_30:
    trigger: "subscription.cancelled"
    delay: "30d"
    subject: "Special offer: 50% off for returning customers"
    template: "winback-30d.html"
```

### Email Templates (React Email)

```tsx
// emails/weekly-summary.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Img,
  Hr,
} from "@react-email/components";

interface WeeklySummaryProps {
  userName: string;
  accountName: string;
  weekOf: string;
  metrics: {
    spend: number;
    spendChange: number;
    conversions: number;
    conversionsChange: number;
    cpa: number;
    cpaChange: number;
    roas: number;
    roasChange: number;
  };
  topRecommendations: Array<{
    title: string;
    savings: number;
  }>;
  healthScore: number;
  healthScoreChange: number;
}

export default function WeeklySummary({
  userName,
  accountName,
  weekOf,
  metrics,
  topRecommendations,
  healthScore,
  healthScoreChange,
}: WeeklySummaryProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src="https://adsmaster.com/logo.png"
              width="150"
              alt="AdsMaster"
            />
          </Section>

          {/* Greeting */}
          <Section style={section}>
            <Text style={heading}>
              Weekly Summary for {accountName}
            </Text>
            <Text style={subheading}>
              Week of {weekOf}
            </Text>
          </Section>

          {/* Health Score */}
          <Section style={healthScoreSection}>
            <Text style={healthScoreLabel}>Account Health Score</Text>
            <Text style={healthScoreValue}>
              {healthScore}/100
              <span style={changeIndicator(healthScoreChange)}>
                {healthScoreChange > 0 ? "+" : ""}{healthScoreChange}
              </span>
            </Text>
          </Section>

          {/* Metrics Grid */}
          <Section style={metricsGrid}>
            <MetricCard
              label="Total Spend"
              value={`$${metrics.spend.toLocaleString()}`}
              change={metrics.spendChange}
              neutral
            />
            <MetricCard
              label="Conversions"
              value={metrics.conversions.toString()}
              change={metrics.conversionsChange}
            />
            <MetricCard
              label="Cost Per Acquisition"
              value={`$${metrics.cpa.toFixed(2)}`}
              change={metrics.cpaChange}
              invertColors
            />
            <MetricCard
              label="ROAS"
              value={`${metrics.roas.toFixed(2)}x`}
              change={metrics.roasChange}
            />
          </Section>

          <Hr style={divider} />

          {/* Recommendations */}
          <Section style={section}>
            <Text style={sectionTitle}>
              Top Recommendations This Week
            </Text>
            {topRecommendations.map((rec, i) => (
              <div key={i} style={recommendationItem}>
                <Text style={recommendationTitle}>{rec.title}</Text>
                <Text style={recommendationSavings}>
                  Save ${rec.savings}/month
                </Text>
              </div>
            ))}
            <Link href="https://app.adsmaster.com/ai" style={ctaButton}>
              View All Recommendations
            </Link>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You received this email because you're subscribed to weekly
              summaries.
            </Text>
            <Link href="https://app.adsmaster.com/settings/notifications">
              Manage preferences
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

---

## 4. WhatsApp Integration

### WhatsApp Business API Setup

```yaml
# WhatsApp notification types
whatsapp_templates:
  # Approved templates (must be pre-approved by WhatsApp)
  critical_alert:
    name: "critical_alert_v1"
    category: "UTILITY"
    language: "en"
    body: |
      ⚠️ *Critical Alert*

      Account: {{1}}
      Issue: {{2}}

      Action needed: {{3}}

      View details: {{4}}

  daily_summary:
    name: "daily_summary_v1"
    category: "UTILITY"
    language: "en"
    body: |
      📊 *Daily Summary*

      Account: {{1}}
      Spend: ${{2}}
      Conversions: {{3}}
      CPA: ${{4}}

      Health Score: {{5}}/100

      View full report: {{6}}

  recommendation_alert:
    name: "recommendation_v1"
    category: "UTILITY"
    language: "en"
    body: |
      💡 *New Recommendation*

      {{1}}

      Potential savings: ${{2}}/month

      Tap to review: {{3}}

  budget_alert:
    name: "budget_alert_v1"
    category: "UTILITY"
    language: "en"
    body: |
      💰 *Budget Alert*

      Your campaign "{{1}}" has spent {{2}}% of its daily budget.

      Current spend: ${{3}}
      Daily budget: ${{4}}

      Manage budget: {{5}}
```

### WhatsApp Service Implementation

```python
# app/services/whatsapp_service.py
from twilio.rest import Client
from app.config import settings

class WhatsAppService:
    """Send WhatsApp notifications via Twilio."""

    def __init__(self):
        self.client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN
        )
        self.from_number = f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}"

    async def send_critical_alert(
        self,
        to_number: str,
        account_name: str,
        issue: str,
        action: str,
        link: str
    ):
        """Send critical alert notification."""
        await self._send_template(
            to_number=to_number,
            template_name="critical_alert_v1",
            parameters=[account_name, issue, action, link]
        )

    async def send_daily_summary(
        self,
        to_number: str,
        account_name: str,
        spend: float,
        conversions: int,
        cpa: float,
        health_score: int,
        link: str
    ):
        """Send daily summary."""
        await self._send_template(
            to_number=to_number,
            template_name="daily_summary_v1",
            parameters=[
                account_name,
                f"{spend:.2f}",
                str(conversions),
                f"{cpa:.2f}",
                str(health_score),
                link
            ]
        )

    async def send_recommendation(
        self,
        to_number: str,
        title: str,
        savings: float,
        link: str
    ):
        """Send new recommendation alert."""
        await self._send_template(
            to_number=to_number,
            template_name="recommendation_v1",
            parameters=[title, f"{savings:.2f}", link]
        )

    async def _send_template(
        self,
        to_number: str,
        template_name: str,
        parameters: list
    ):
        """Send WhatsApp template message."""
        # Format parameters for Twilio
        content_variables = {
            str(i + 1): param for i, param in enumerate(parameters)
        }

        message = self.client.messages.create(
            from_=self.from_number,
            to=f"whatsapp:{to_number}",
            content_sid=f"HX{template_name}",  # Twilio content template SID
            content_variables=content_variables
        )

        return message.sid
```

---

## 5. Customer Support

### Support Channels

```yaml
support_tiers:
  free_audit:
    channels: ["help_center", "community_forum"]
    response_time: null  # Self-service

  starter:
    channels: ["help_center", "email"]
    response_time: "48 hours"

  growth:
    channels: ["help_center", "email", "chat"]
    response_time: "24 hours"

  agency:
    channels: ["help_center", "email", "chat", "phone", "dedicated_manager"]
    response_time: "4 hours"

  enterprise:
    channels: ["all + dedicated slack channel"]
    response_time: "1 hour"
```

### Help Center Structure

```
/help/
├── getting-started/
│   ├── connecting-google-ads.md
│   ├── understanding-your-audit.md
│   ├── applying-recommendations.md
│   └── setting-up-alerts.md
│
├── features/
│   ├── ai-recommendations.md
│   ├── ai-advisor-chat.md
│   ├── automation-rules.md
│   ├── reports.md
│   └── pmax-insights.md
│
├── billing/
│   ├── pricing-plans.md
│   ├── upgrade-downgrade.md
│   ├── payment-methods.md
│   └── invoices.md
│
├── troubleshooting/
│   ├── connection-issues.md
│   ├── sync-errors.md
│   └── common-errors.md
│
└── api/
    └── api-documentation.md
```

### AI-Powered Support

```python
# Support chatbot uses same Gemini integration
async def handle_support_query(
    query: str,
    user_context: dict
) -> str:
    """
    AI-powered support first, escalate to human if needed.
    """
    # Check if it's a known FAQ
    faq_match = await match_faq(query)
    if faq_match and faq_match.confidence > 0.9:
        return faq_match.answer

    # Use Gemini to generate answer based on docs
    prompt = f"""
    You are a support agent for AdsMaster, an AI-powered advertising platform.

    User Context:
    - Plan: {user_context['plan']}
    - Connected accounts: {user_context['accounts']}
    - Recent issues: {user_context['recent_issues']}

    User Question: {query}

    Answer the question helpfully. If you can't answer or the user needs
    billing/technical support, say "I'll connect you with our support team."

    Keep response under 200 words.
    """

    response = await gemini_client.generate(prompt)

    # Check if escalation needed
    if "connect you with" in response.lower():
        await create_support_ticket(user_context, query)
        return response + "\n\nI've created a support ticket. Our team will respond within 24 hours."

    return response
```

---

## 6. Customer Health & Retention

### Customer Health Score

```python
# app/services/customer_health_service.py

class CustomerHealthService:
    """Track and predict customer health/churn risk."""

    async def calculate_health_score(
        self,
        organization_id: str
    ) -> CustomerHealthScore:
        """
        Calculate customer health score (0-100).
        Higher = healthier, lower = churn risk.
        """
        metrics = await self._get_customer_metrics(organization_id)

        # Weighted scoring
        scores = {
            "login_frequency": self._score_logins(metrics.logins_30d),
            "feature_usage": self._score_features(metrics.features_used),
            "recommendation_adoption": self._score_adoption(
                metrics.recommendations_applied,
                metrics.recommendations_total
            ),
            "ai_chat_usage": self._score_chat(metrics.ai_messages_30d),
            "account_health": self._score_account_health(
                metrics.avg_account_health_score
            ),
            "billing_health": self._score_billing(
                metrics.payment_failures,
                metrics.days_until_renewal
            )
        }

        weights = {
            "login_frequency": 0.20,
            "feature_usage": 0.20,
            "recommendation_adoption": 0.25,
            "ai_chat_usage": 0.10,
            "account_health": 0.15,
            "billing_health": 0.10
        }

        total_score = sum(
            scores[key] * weights[key]
            for key in scores
        )

        # Determine risk level
        risk_level = (
            "healthy" if total_score >= 70 else
            "at_risk" if total_score >= 40 else
            "critical"
        )

        return CustomerHealthScore(
            organization_id=organization_id,
            score=int(total_score),
            risk_level=risk_level,
            breakdown=scores,
            calculated_at=datetime.utcnow()
        )

    def _score_logins(self, logins_30d: int) -> int:
        """Score based on login frequency."""
        if logins_30d >= 20:
            return 100  # Daily active
        elif logins_30d >= 10:
            return 80   # Regular
        elif logins_30d >= 4:
            return 50   # Weekly
        elif logins_30d >= 1:
            return 30   # Monthly
        return 0  # Inactive

    def _score_adoption(
        self,
        applied: int,
        total: int
    ) -> int:
        """Score based on recommendation adoption rate."""
        if total == 0:
            return 50  # Neutral if no recommendations
        rate = applied / total
        return int(rate * 100)
```

### Churn Prevention Automation

```yaml
# Automated interventions based on health score
churn_prevention:
  # Risk: At-risk (score 40-69)
  at_risk_triggers:
    - condition: "health_score < 70 AND health_score >= 40"
      actions:
        - send_email: "we_miss_you"
        - assign_csm_task: "outreach_call"
        - show_in_app_message: "schedule_demo"

  # Risk: Critical (score < 40)
  critical_triggers:
    - condition: "health_score < 40"
      actions:
        - send_email: "special_offer"
        - assign_csm_task: "urgent_outreach"
        - enable_discount: "20% off next 3 months"
        - slack_alert: "#customer-success"

  # Specific behaviors
  no_login_7_days:
    condition: "days_since_login >= 7"
    actions:
      - send_email: "we_noticed_you_havent_logged_in"
      - send_push_notification: true

  no_recommendation_applied_14_days:
    condition: "pending_recommendations > 5 AND days_since_last_apply >= 14"
    actions:
      - send_email: "savings_waiting"
      - send_whatsapp: "recommendation_reminder"

  approaching_renewal_unhealthy:
    condition: "days_until_renewal <= 7 AND health_score < 50"
    actions:
      - assign_csm_task: "renewal_save"
      - send_email: "renewal_value_reminder"
      - enable_discount: "30% off yearly"
```

---

## 7. Customer Success Metrics

### Key Metrics Dashboard

```yaml
metrics:
  # Acquisition
  acquisition:
    - new_signups_daily
    - signup_to_connect_rate
    - connect_to_trial_rate
    - trial_to_paid_rate
    - cac (cost per acquisition)

  # Activation
  activation:
    - time_to_first_value (audit complete)
    - time_to_first_recommendation_applied
    - onboarding_completion_rate
    - feature_adoption_rate

  # Revenue
  revenue:
    - mrr (monthly recurring revenue)
    - arr (annual recurring revenue)
    - arpu (average revenue per user)
    - ltv (lifetime value)
    - expansion_revenue (upgrades)
    - contraction_revenue (downgrades)

  # Retention
  retention:
    - churn_rate_monthly
    - churn_rate_annual
    - net_revenue_retention
    - gross_revenue_retention
    - cohort_retention (30/60/90/180/365 day)

  # Engagement
  engagement:
    - dau (daily active users)
    - wau (weekly active users)
    - mau (monthly active users)
    - average_session_duration
    - ai_chat_messages_per_user
    - recommendations_applied_per_user

  # Satisfaction
  satisfaction:
    - nps (net promoter score)
    - csat (customer satisfaction)
    - support_ticket_volume
    - time_to_resolution
```

### Cohort Analysis

```sql
-- Monthly cohort retention analysis
WITH cohorts AS (
  SELECT
    organization_id,
    DATE_TRUNC('month', created_at) AS cohort_month,
    created_at
  FROM subscriptions
  WHERE plan_id != 'free_audit'
),
retention AS (
  SELECT
    c.cohort_month,
    DATE_DIFF(
      DATE_TRUNC('month', a.activity_date),
      c.cohort_month,
      MONTH
    ) AS months_since_signup,
    COUNT(DISTINCT c.organization_id) AS users
  FROM cohorts c
  JOIN organization_activity a ON c.organization_id = a.organization_id
  GROUP BY 1, 2
)
SELECT
  cohort_month,
  months_since_signup,
  users,
  users * 100.0 / FIRST_VALUE(users) OVER (
    PARTITION BY cohort_month
    ORDER BY months_since_signup
  ) AS retention_rate
FROM retention
ORDER BY cohort_month, months_since_signup;
```

---

## Summary

### Customer Handling Components

| Area | Implementation | Priority |
|------|----------------|----------|
| Onboarding | 6-step wizard + checklist | P0 |
| Billing | Stripe integration | P0 |
| Email | SendGrid + React Email | P0 |
| WhatsApp | Twilio Business API | P1 |
| Support | Help center + AI chat | P1 |
| Health Scoring | Custom analytics | P2 |
| Churn Prevention | Automated workflows | P2 |

### Key Flows

1. **Signup → Audit → Trial → Paid** (core funnel)
2. **Payment failure → Recovery** (revenue protection)
3. **At-risk → Intervention → Retention** (churn prevention)
4. **Cancel → Win-back** (recovery)

---

*Document Version: 1.0*
*Created: March 2026*
*Status: READY FOR REVIEW*
