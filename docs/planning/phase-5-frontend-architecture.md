# Phase 5: Frontend/UI Architecture Plan

## Executive Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Framework** | Next.js 15 (App Router) | SSR, RSC, file-based routing |
| **Language** | TypeScript (strict) | Type safety, better DX |
| **Styling** | TailwindCSS + shadcn/ui | Utility-first, accessible components |
| **State** | Zustand + React Query | Lightweight, server state separation |
| **Charts** | Recharts | React-native, responsive |
| **Forms** | React Hook Form + Zod | Performance, validation |
| **Animations** | Framer Motion | Smooth transitions |
| **Icons** | Lucide Icons | Consistent, tree-shakeable |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS 15 APP                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           APP ROUTER                                  │   │
│  │                                                                       │   │
│  │  /                          → Landing page (public)                   │   │
│  │  /login                     → Authentication                          │   │
│  │  /signup                    → Registration                            │   │
│  │  /dashboard                 → Main dashboard                          │   │
│  │  /dashboard/accounts        → Ad accounts management                  │   │
│  │  /dashboard/campaigns       → Campaign management                     │   │
│  │  /dashboard/ai              → AI recommendations                      │   │
│  │  /dashboard/chat            → AI advisor chat                         │   │
│  │  /dashboard/reports         → Reports & analytics                     │   │
│  │  /dashboard/settings        → User & org settings                     │   │
│  │  /dashboard/billing         → Subscription & billing                  │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         COMPONENT LAYERS                              │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │   Pages     │  │   Layouts   │  │   Features  │  │    UI      │  │   │
│  │  │  (routes)   │  │  (shared)   │  │ (business)  │  │(primitives)│  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │                      STATE MANAGEMENT                            │ │   │
│  │  │                                                                  │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │ │   │
│  │  │  │   Zustand   │  │ React Query │  │   Context (auth, theme) │ │ │   │
│  │  │  │  (global)   │  │  (server)   │  │                         │ │ │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
                              ┌─────────────────┐
                              │    API LAYER    │
                              │                 │
                              │  • REST calls   │
                              │  • WebSocket    │
                              │  • File uploads │
                              └─────────────────┘
```

---

## Directory Structure

```
/frontend/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # Auth routes group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── layout.tsx             # Auth layout (no sidebar)
│   │
│   ├── (dashboard)/               # Dashboard routes group
│   │   ├── dashboard/
│   │   │   ├── page.tsx           # Main dashboard
│   │   │   ├── loading.tsx        # Loading skeleton
│   │   │   └── error.tsx          # Error boundary
│   │   │
│   │   ├── accounts/
│   │   │   ├── page.tsx           # Accounts list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx       # Account detail
│   │   │   └── connect/
│   │   │       └── page.tsx       # Connect new account
│   │   │
│   │   ├── campaigns/
│   │   │   ├── page.tsx           # Campaigns list
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Campaign detail
│   │   │       ├── keywords/
│   │   │       │   └── page.tsx
│   │   │       └── search-terms/
│   │   │           └── page.tsx
│   │   │
│   │   ├── ai/
│   │   │   ├── page.tsx           # Recommendations
│   │   │   └── chat/
│   │   │       ├── page.tsx       # AI chat
│   │   │       └── [id]/
│   │   │           └── page.tsx   # Conversation
│   │   │
│   │   ├── reports/
│   │   │   ├── page.tsx           # Reports list
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Report detail
│   │   │
│   │   ├── settings/
│   │   │   ├── page.tsx           # Settings overview
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   ├── organization/
│   │   │   │   └── page.tsx
│   │   │   ├── team/
│   │   │   │   └── page.tsx
│   │   │   └── notifications/
│   │   │       └── page.tsx
│   │   │
│   │   ├── billing/
│   │   │   ├── page.tsx           # Billing overview
│   │   │   └── invoices/
│   │   │       └── page.tsx
│   │   │
│   │   └── layout.tsx             # Dashboard layout (with sidebar)
│   │
│   ├── (marketing)/               # Marketing pages group
│   │   ├── page.tsx               # Landing page
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── features/
│   │   │   └── page.tsx
│   │   └── layout.tsx             # Marketing layout
│   │
│   ├── api/                       # API routes (Next.js)
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts       # NextAuth handlers
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts
│   │
│   ├── layout.tsx                 # Root layout
│   ├── loading.tsx                # Global loading
│   ├── error.tsx                  # Global error
│   ├── not-found.tsx              # 404 page
│   └── globals.css                # Global styles
│
├── components/                    # React components
│   ├── ui/                        # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── layout/                    # Layout components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── mobile-nav.tsx
│   │   └── breadcrumb.tsx
│   │
│   ├── features/                  # Feature-specific components
│   │   ├── dashboard/
│   │   │   ├── stats-cards.tsx
│   │   │   ├── performance-chart.tsx
│   │   │   ├── recent-alerts.tsx
│   │   │   └── quick-actions.tsx
│   │   │
│   │   ├── accounts/
│   │   │   ├── account-card.tsx
│   │   │   ├── account-list.tsx
│   │   │   ├── connect-modal.tsx
│   │   │   └── sync-status.tsx
│   │   │
│   │   ├── campaigns/
│   │   │   ├── campaign-table.tsx
│   │   │   ├── campaign-card.tsx
│   │   │   ├── campaign-filters.tsx
│   │   │   ├── budget-editor.tsx
│   │   │   └── status-badge.tsx
│   │   │
│   │   ├── metrics/
│   │   │   ├── metric-card.tsx
│   │   │   ├── trend-indicator.tsx
│   │   │   ├── sparkline.tsx
│   │   │   ├── date-range-picker.tsx
│   │   │   └── comparison-chart.tsx
│   │   │
│   │   ├── ai/
│   │   │   ├── recommendation-card.tsx
│   │   │   ├── recommendation-list.tsx
│   │   │   ├── chat-interface.tsx
│   │   │   ├── chat-message.tsx
│   │   │   ├── chat-input.tsx
│   │   │   └── typing-indicator.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── report-card.tsx
│   │   │   ├── before-after-chart.tsx
│   │   │   └── health-score-gauge.tsx
│   │   │
│   │   └── billing/
│   │       ├── plan-card.tsx
│   │       ├── usage-meter.tsx
│   │       └── invoice-table.tsx
│   │
│   └── shared/                    # Shared components
│       ├── data-table.tsx         # Reusable data table
│       ├── empty-state.tsx
│       ├── loading-skeleton.tsx
│       ├── error-boundary.tsx
│       ├── confirm-dialog.tsx
│       ├── search-input.tsx
│       ├── avatar.tsx
│       └── logo.tsx
│
├── lib/                           # Utilities & configurations
│   ├── api/                       # API client
│   │   ├── client.ts              # Axios/fetch setup
│   │   ├── endpoints.ts           # API endpoints
│   │   ├── auth.ts                # Auth API calls
│   │   ├── accounts.ts            # Accounts API calls
│   │   ├── campaigns.ts           # Campaigns API calls
│   │   ├── metrics.ts             # Metrics API calls
│   │   └── ai.ts                  # AI API calls
│   │
│   ├── hooks/                     # Custom hooks
│   │   ├── use-auth.ts
│   │   ├── use-accounts.ts
│   │   ├── use-campaigns.ts
│   │   ├── use-metrics.ts
│   │   ├── use-websocket.ts
│   │   ├── use-debounce.ts
│   │   └── use-local-storage.ts
│   │
│   ├── stores/                    # Zustand stores
│   │   ├── auth-store.ts
│   │   ├── account-store.ts
│   │   ├── ui-store.ts
│   │   └── notification-store.ts
│   │
│   ├── utils/                     # Utility functions
│   │   ├── format.ts              # Number/date formatting
│   │   ├── money.ts               # Money formatting (micros)
│   │   ├── validation.ts          # Zod schemas
│   │   └── cn.ts                  # Class name helper
│   │
│   └── config/                    # Configuration
│       ├── site.ts                # Site metadata
│       ├── navigation.ts          # Nav menu config
│       └── charts.ts              # Chart configurations
│
├── types/                         # TypeScript types
│   ├── api.ts                     # API response types
│   ├── account.ts
│   ├── campaign.ts
│   ├── metrics.ts
│   ├── ai.ts
│   └── index.ts
│
├── styles/                        # Additional styles
│   └── charts.css                 # Chart-specific styles
│
├── public/                        # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── .env.local
```

---

## Key UI Components

### 1. Dashboard Layout

```tsx
// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - hidden on mobile */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with mobile menu */}
        <Header>
          <MobileNav className="lg:hidden" />
        </Header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 2. Sidebar Navigation

```tsx
// components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Link2,
  Target,
  Sparkles,
  MessageSquare,
  FileText,
  Settings,
  CreditCard,
  ChevronDown,
  LogOut,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Ad Accounts",
    href: "/accounts",
    icon: Link2,
  },
  {
    name: "Campaigns",
    href: "/campaigns",
    icon: Target,
  },
  {
    name: "AI Recommendations",
    href: "/ai",
    icon: Sparkles,
    badge: 5, // Number of pending recommendations
  },
  {
    name: "AI Advisor",
    href: "/ai/chat",
    icon: MessageSquare,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
  },
];

const bottomNavigation = [
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    name: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800 border-r">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600" />
          <span className="text-xl font-bold">AdsMaster</span>
        </Link>
      </div>

      {/* Account selector */}
      <div className="px-4 py-4 border-b">
        <AccountSelector />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              )}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
              {item.badge && (
                <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="px-4 py-4 border-t space-y-1">
        {bottomNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </div>

      {/* User menu */}
      <div className="px-4 py-4 border-t">
        <UserMenu />
      </div>
    </div>
  );
}
```

### 3. Dashboard Stats Cards

```tsx
// components/features/dashboard/stats-cards.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendIndicator } from "@/components/features/metrics/trend-indicator";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils/format";
import { DollarSign, MousePointerClick, ShoppingCart, TrendingUp } from "lucide-react";

interface MetricsSummary {
  spend: { current: number; previous: number; change_percent: number };
  conversions: { current: number; previous: number; change_percent: number };
  cpa: { current: number; previous: number; change_percent: number };
  roas: { current: number; previous: number; change_percent: number };
}

interface StatsCardsProps {
  metrics: MetricsSummary;
  currency?: string;
}

export function StatsCards({ metrics, currency = "USD" }: StatsCardsProps) {
  const stats = [
    {
      title: "Total Spend",
      value: formatMoney(metrics.spend.current, currency),
      change: metrics.spend.change_percent,
      trend: "neutral", // Spend going up is neither good nor bad
      icon: DollarSign,
      color: "blue",
    },
    {
      title: "Conversions",
      value: formatNumber(metrics.conversions.current),
      change: metrics.conversions.change_percent,
      trend: metrics.conversions.change_percent > 0 ? "up" : "down",
      invertColors: false, // Up is good
      icon: ShoppingCart,
      color: "green",
    },
    {
      title: "Cost Per Acquisition",
      value: formatMoney(metrics.cpa.current, currency),
      change: metrics.cpa.change_percent,
      trend: metrics.cpa.change_percent < 0 ? "up" : "down",
      invertColors: true, // Down is good for CPA
      icon: MousePointerClick,
      color: "purple",
    },
    {
      title: "ROAS",
      value: `${metrics.roas.current.toFixed(2)}x`,
      change: metrics.roas.change_percent,
      trend: metrics.roas.change_percent > 0 ? "up" : "down",
      invertColors: false, // Up is good
      icon: TrendingUp,
      color: "orange",
    },
  ];

  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {stat.title}
            </CardTitle>
            <div className={cn("p-2 rounded-lg", colorClasses[stat.color])}>
              <stat.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="flex items-center mt-1">
              <TrendIndicator
                value={stat.change}
                invertColors={stat.invertColors}
              />
              <span className="text-xs text-gray-500 ml-1">
                vs last period
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 4. Performance Chart

```tsx
// components/features/dashboard/performance-chart.tsx
"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/features/metrics/date-range-picker";
import { formatMoney, formatNumber } from "@/lib/utils/format";

interface MetricData {
  date: string;
  spend: number;
  conversions: number;
  clicks: number;
  impressions: number;
}

interface PerformanceChartProps {
  data: MetricData[];
  currency?: string;
}

type MetricKey = "spend" | "conversions" | "clicks" | "impressions";

export function PerformanceChart({
  data,
  currency = "USD",
}: PerformanceChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>([
    "spend",
    "conversions",
  ]);

  const metrics: Record<MetricKey, { label: string; color: string }> = {
    spend: { label: "Spend", color: "#3B82F6" },
    conversions: { label: "Conversions", color: "#10B981" },
    clicks: { label: "Clicks", color: "#8B5CF6" },
    impressions: { label: "Impressions", color: "#F59E0B" },
  };

  const toggleMetric = (metric: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );
  };

  const formatYAxis = (value: number, metric: MetricKey) => {
    if (metric === "spend") return formatMoney(value, currency, true);
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Performance Trends</CardTitle>
        <div className="flex items-center space-x-4">
          {/* Metric toggles */}
          <div className="flex space-x-2">
            {Object.entries(metrics).map(([key, { label, color }]) => (
              <button
                key={key}
                onClick={() => toggleMetric(key as MetricKey)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                  activeMetrics.includes(key as MetricKey)
                    ? "text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
                style={{
                  backgroundColor: activeMetrics.includes(key as MetricKey)
                    ? color
                    : undefined,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <DateRangePicker />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatYAxis(value, "spend")}
              />
              {activeMetrics.includes("conversions") && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "spend") return [formatMoney(value, currency), "Spend"];
                  return [formatNumber(value), name];
                }}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <Legend />

              {activeMetrics.map((metric) => (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  name={metrics[metric].label}
                  stroke={metrics[metric].color}
                  strokeWidth={2}
                  dot={false}
                  yAxisId={metric === "spend" ? "left" : "right"}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5. AI Chat Interface

```tsx
// components/features/ai/chat-interface.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/lib/hooks/use-chat";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  context_data?: Record<string, any>;
}

interface ChatInterfaceProps {
  conversationId?: string;
  accountId: string;
}

export function ChatInterface({ conversationId, accountId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sendMessage,
    isLoading,
    error,
    streamingContent,
  } = useChat({ conversationId, accountId });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = async (content: string) => {
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send to API and get response
    const response = await sendMessage(content);

    if (response) {
      const assistantMessage: Message = {
        id: response.id,
        role: "assistant",
        content: response.content,
        timestamp: new Date(response.created_at),
        context_data: response.context_data,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  };

  const suggestedQuestions = [
    "Why is my CPA increasing this week?",
    "Which keywords are wasting money?",
    "How can I improve my ROAS?",
    "Show me performance trends",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-gray-800 rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <span className="font-medium">AI Advisor</span>
        </div>
        <Button variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          New conversation
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Ask me anything about your ads
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm">
              I can analyze your campaigns, explain metrics, suggest
              optimizations, and answer questions in plain English.
            </p>

            {/* Suggested questions */}
            <div className="flex flex-wrap justify-center gap-2">
              {suggestedQuestions.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSend(question)}
                  className="text-sm"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* Streaming response */}
            {streamingContent && (
              <ChatMessage
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingContent,
                  timestamp: new Date(),
                }}
                isStreaming
              />
            )}

            {/* Typing indicator */}
            {isLoading && !streamingContent && <TypingIndicator />}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3">
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
```

### 6. Recommendation Card

```tsx
// components/features/ai/recommendation-card.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface RecommendationOption {
  id: number;
  label: string;
  action: string;
  risk: "low" | "medium" | "high";
}

interface Recommendation {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical" | "opportunity";
  title: string;
  description: string;
  impact_estimate: {
    monthly_savings?: number;
    potential_gain?: number;
    risk: string;
  };
  affected_entities: {
    keywords?: Array<{ text: string; spend_7d: number; conversions_7d: number }>;
  };
  options: RecommendationOption[];
  status: "pending" | "approved" | "rejected";
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onApprove: (id: string, optionId: number) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export function RecommendationCard({
  recommendation,
  onApprove,
  onReject,
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const severityConfig = {
    info: {
      icon: Info,
      color: "bg-blue-50 text-blue-700 border-blue-200",
      badge: "bg-blue-100 text-blue-800",
    },
    warning: {
      icon: AlertTriangle,
      color: "bg-yellow-50 text-yellow-700 border-yellow-200",
      badge: "bg-yellow-100 text-yellow-800",
    },
    critical: {
      icon: AlertTriangle,
      color: "bg-red-50 text-red-700 border-red-200",
      badge: "bg-red-100 text-red-800",
    },
    opportunity: {
      icon: Lightbulb,
      color: "bg-green-50 text-green-700 border-green-200",
      badge: "bg-green-100 text-green-800",
    },
  };

  const config = severityConfig[recommendation.severity];
  const Icon = config.icon;

  const handleApprove = async () => {
    if (!selectedOption) return;
    setIsLoading(true);
    try {
      await onApprove(recommendation.id, selectedOption);
      setShowApproveDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject(recommendation.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className={cn("border-l-4", config.color)}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn("p-2 rounded-lg", config.badge)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-medium">{recommendation.title}</h3>
                <Badge variant="outline" className="mt-1">
                  {recommendation.type.replace("_", " ")}
                </Badge>
              </div>
            </div>

            {recommendation.impact_estimate.monthly_savings && (
              <div className="text-right">
                <span className="text-sm text-gray-500">Potential savings</span>
                <p className="text-lg font-bold text-green-600">
                  {formatMoney(recommendation.impact_estimate.monthly_savings)}/mo
                </p>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            {recommendation.description}
          </p>

          {/* Expandable details */}
          {recommendation.affected_entities.keywords && (
            <div className="mb-4">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-1" />
                )}
                {expanded ? "Hide" : "Show"} affected keywords (
                {recommendation.affected_entities.keywords.length})
              </button>

              {expanded && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Keyword</th>
                        <th className="px-3 py-2 text-right">Spend (7d)</th>
                        <th className="px-3 py-2 text-right">Conversions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendation.affected_entities.keywords.map((kw, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">
                            {kw.text}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatMoney(kw.spend_7d)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {kw.conversions_7d}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowApproveDialog(true)}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Review & Apply
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isLoading}
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog with Options */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Action Level</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {recommendation.options.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className={cn(
                  "w-full p-4 text-left border rounded-lg transition-colors",
                  selectedOption === option.id
                    ? "border-blue-600 bg-blue-50"
                    : "hover:border-gray-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  <Badge
                    variant={
                      option.risk === "low"
                        ? "success"
                        : option.risk === "medium"
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {option.risk} risk
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">{option.action}</p>
              </button>
            ))}
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleApprove}
              disabled={!selectedOption || isLoading}
              className="flex-1"
            >
              {isLoading ? "Applying..." : "Apply Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## State Management

### 1. Auth Store (Zustand)

```tsx
// lib/stores/auth-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  organizations: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  currentOrganization: string | null;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setCurrentOrganization: (orgId: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      currentOrganization: null,

      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          currentOrganization:
            user.organizations.length > 0 ? user.organizations[0].id : null,
        });
      },

      setCurrentOrganization: (orgId) => {
        set({ currentOrganization: orgId });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          currentOrganization: null,
        });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        currentOrganization: state.currentOrganization,
      }),
    }
  )
);
```

### 2. React Query Hooks

```tsx
// lib/hooks/use-campaigns.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignsApi } from "@/lib/api/campaigns";
import { useAccountStore } from "@/lib/stores/account-store";

export function useCampaigns(filters?: {
  status?: string[];
  type?: string[];
  search?: string;
}) {
  const currentAccountId = useAccountStore((s) => s.currentAccountId);

  return useQuery({
    queryKey: ["campaigns", currentAccountId, filters],
    queryFn: () => campaignsApi.list(currentAccountId!, filters),
    enabled: !!currentAccountId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => campaignsApi.get(campaignId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      data,
    }: {
      campaignId: string;
      data: { budget?: { amount: number }; status?: string };
    }) => campaignsApi.update(campaignId, data),

    onSuccess: (data, variables) => {
      // Invalidate campaign list
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      // Update single campaign cache
      queryClient.setQueryData(["campaign", variables.campaignId], data);
    },
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) => campaignsApi.pause(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
```

### 3. WebSocket Hook

```tsx
// lib/hooks/use-websocket.ts
import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

type MessageHandler = (data: any) => void;

interface UseWebSocketOptions {
  channels: string[];
  onMessage: MessageHandler;
}

export function useWebSocket({ channels, onMessage }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  const connect = useCallback(() => {
    if (!accessToken) return;

    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}/ws/v1?token=${accessToken}`
    );

    ws.onopen = () => {
      console.log("WebSocket connected");
      // Subscribe to channels
      channels.forEach((channel) => {
        ws.send(JSON.stringify({ action: "subscribe", channel }));
      });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current = ws;
  }, [accessToken, channels, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { send };
}
```

---

## Data Fetching Patterns

### 1. Server Components (RSC)

```tsx
// app/(dashboard)/dashboard/page.tsx
import { Suspense } from "react";
import { StatsCards } from "@/components/features/dashboard/stats-cards";
import { PerformanceChart } from "@/components/features/dashboard/performance-chart";
import { RecentAlerts } from "@/components/features/dashboard/recent-alerts";
import { QuickActions } from "@/components/features/dashboard/quick-actions";
import { getDashboardData } from "@/lib/api/server/dashboard";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

// Server Component - data fetched on server
export default async function DashboardPage() {
  // Fetch data on server (no client JS for this)
  const dashboardData = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <QuickActions />
      </div>

      {/* Stats are static, render on server */}
      <StatsCards metrics={dashboardData.summary} />

      {/* Chart is interactive, use Suspense */}
      <Suspense fallback={<LoadingSkeleton className="h-[400px]" />}>
        <PerformanceChart data={dashboardData.daily_metrics} />
      </Suspense>

      {/* Alerts update frequently, fetch client-side */}
      <Suspense fallback={<LoadingSkeleton className="h-[200px]" />}>
        <RecentAlerts accountId={dashboardData.account_id} />
      </Suspense>
    </div>
  );
}
```

### 2. Client Components with React Query

```tsx
// components/features/dashboard/recent-alerts.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { alertsApi } from "@/lib/api/alerts";
import { AlertCard } from "./alert-card";
import { useWebSocket } from "@/lib/hooks/use-websocket";
import { useQueryClient } from "@tanstack/react-query";

interface RecentAlertsProps {
  accountId: string;
}

export function RecentAlerts({ accountId }: RecentAlertsProps) {
  const queryClient = useQueryClient();

  // Initial data fetch
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["alerts", accountId],
    queryFn: () => alertsApi.list(accountId, { limit: 5 }),
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  // Real-time updates via WebSocket
  useWebSocket({
    channels: [`account:${accountId}:alerts`],
    onMessage: (data) => {
      if (data.event === "new_alert") {
        // Add new alert to cache
        queryClient.setQueryData(
          ["alerts", accountId],
          (old: any) => [data.data, ...(old || [])].slice(0, 5)
        );
      }
    },
  });

  if (isLoading) {
    return <LoadingSkeleton className="h-[200px]" />;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Recent Alerts</h2>
      {alerts?.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
```

---

## Responsive Design

### Mobile-First Approach

```css
/* globals.css */

/* Mobile-first breakpoints */
/* sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px */

/* Example: Campaign table on mobile becomes cards */
@media (max-width: 768px) {
  .campaign-table {
    display: none;
  }

  .campaign-cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
}

@media (min-width: 769px) {
  .campaign-table {
    display: table;
  }

  .campaign-cards {
    display: none;
  }
}
```

### Responsive Component Example

```tsx
// components/features/campaigns/campaign-list.tsx
"use client";

import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { CampaignTable } from "./campaign-table";
import { CampaignCards } from "./campaign-cards";

export function CampaignList({ campaigns }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return <CampaignTable campaigns={campaigns} />;
  }

  return <CampaignCards campaigns={campaigns} />;
}
```

---

## Testing Strategy

### Component Testing

```tsx
// __tests__/components/stats-cards.test.tsx
import { render, screen } from "@testing-library/react";
import { StatsCards } from "@/components/features/dashboard/stats-cards";

const mockMetrics = {
  spend: { current: 2340, previous: 2150, change_percent: 8.8 },
  conversions: { current: 156, previous: 132, change_percent: 18.2 },
  cpa: { current: 15.0, previous: 16.29, change_percent: -7.9 },
  roas: { current: 4.2, previous: 3.8, change_percent: 10.5 },
};

describe("StatsCards", () => {
  it("renders all stat cards", () => {
    render(<StatsCards metrics={mockMetrics} />);

    expect(screen.getByText("Total Spend")).toBeInTheDocument();
    expect(screen.getByText("Conversions")).toBeInTheDocument();
    expect(screen.getByText("Cost Per Acquisition")).toBeInTheDocument();
    expect(screen.getByText("ROAS")).toBeInTheDocument();
  });

  it("displays formatted values", () => {
    render(<StatsCards metrics={mockMetrics} currency="USD" />);

    expect(screen.getByText("$2,340.00")).toBeInTheDocument();
    expect(screen.getByText("156")).toBeInTheDocument();
    expect(screen.getByText("$15.00")).toBeInTheDocument();
    expect(screen.getByText("4.20x")).toBeInTheDocument();
  });

  it("shows correct trend indicators", () => {
    render(<StatsCards metrics={mockMetrics} />);

    // Conversions up = green
    const conversionsCard = screen.getByText("Conversions").closest("div");
    expect(conversionsCard).toContainElement(
      screen.getByText("+18.2%")
    );
  });
});
```

---

## Summary

### Frontend Components

| Category | Count | Technology |
|----------|-------|------------|
| Pages (routes) | 20+ | Next.js App Router |
| UI Primitives | 30+ | shadcn/ui |
| Feature Components | 50+ | React |
| Hooks | 15+ | Custom hooks |
| Stores | 4 | Zustand |

### Key Patterns

1. **App Router** - File-based routing, layouts, loading states
2. **Server Components** - Fetch on server where possible
3. **React Query** - Server state, caching, real-time
4. **Zustand** - Client state (auth, UI)
5. **TailwindCSS** - Utility-first, responsive
6. **WebSocket** - Real-time updates

### Performance Optimizations

- Server-side rendering for initial load
- Code splitting with dynamic imports
- Image optimization with next/image
- Font optimization with next/font
- Skeleton loading states
- Stale-while-revalidate caching

---

*Document Version: 1.0*
*Created: March 2026*
*Status: READY FOR REVIEW*
