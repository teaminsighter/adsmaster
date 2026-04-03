'use client';

import { useState } from 'react';
import {
  useAIOverview,
  useAIModels,
  useAIPrompts,
  useRecommendationRules,
  useAIBudgets,
} from '@/lib/hooks/useAdminApi';

function StatCard({ label, value, subValue, icon }: {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: string;
}) {
  return (
    <div className="stat-card">
      {icon && <div className="stat-icon">{icon}</div>}
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {subValue && <div className="stat-sub">{subValue}</div>}
      </div>

      <style jsx>{`
        .stat-card {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .stat-icon {
          font-size: 28px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 12px;
        }
        .stat-content { flex: 1; }
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--admin-accent);
          line-height: 1.2;
        }
        .stat-label {
          font-size: 13px;
          color: var(--admin-text-muted);
          margin-top: 4px;
        }
        .stat-sub {
          font-size: 12px;
          color: var(--admin-text-dim);
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}

type TabType = 'overview' | 'models' | 'prompts' | 'rules' | 'budgets';

export default function AIPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { data: overview, loading: overviewLoading } = useAIOverview();
  const { data: models, loading: modelsLoading } = useAIModels();
  const { data: prompts, loading: promptsLoading } = useAIPrompts();
  const { data: rules, loading: rulesLoading } = useRecommendationRules();
  const { data: budgets, loading: budgetsLoading } = useAIBudgets();

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'models', label: 'Models' },
    { id: 'prompts', label: 'Prompts' },
    { id: 'rules', label: 'Rules' },
    { id: 'budgets', label: 'Budgets' },
  ];

  const formatCost = (cost: number) => `$${cost.toFixed(2)}`;
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <div className="ai-page">
      <div className="page-header">
        <h1 className="page-title">AI & ML Control</h1>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {overviewLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <>
              <div className="stats-grid">
                <StatCard
                  icon="🤖"
                  label="Requests Today"
                  value={overview?.today.requests || 0}
                />
                <StatCard
                  icon="📊"
                  label="Tokens Today"
                  value={formatTokens(overview?.today.tokens || 0)}
                />
                <StatCard
                  icon="💰"
                  label="Cost Today"
                  value={formatCost(overview?.today.cost || 0)}
                />
                <StatCard
                  icon="📈"
                  label="Cost This Month"
                  value={formatCost(overview?.month.cost || 0)}
                />
              </div>

              <div className="panel">
                <h2 className="panel-title">Usage by Provider</h2>
                <div className="providers-grid">
                  {overview?.by_provider && Object.entries(overview.by_provider).map(([provider, data]) => (
                    <div key={provider} className="provider-card">
                      <div className="provider-name">{provider}</div>
                      <div className="provider-stats">
                        <div className="provider-stat">
                          <span className="provider-stat-value">{data.requests}</span>
                          <span className="provider-stat-label">requests</span>
                        </div>
                        <div className="provider-stat">
                          <span className="provider-stat-value">{formatTokens(data.tokens)}</span>
                          <span className="provider-stat-label">tokens</span>
                        </div>
                        <div className="provider-stat">
                          <span className="provider-stat-value">{formatCost(data.cost)}</span>
                          <span className="provider-stat-label">cost</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="panel">
          <h2 className="panel-title">AI Model Configurations</h2>
          {modelsLoading ? (
            <div className="loading">Loading models...</div>
          ) : (
            <div className="models-grid">
              {models?.models.map((model) => (
                <div key={model.id} className="model-card">
                  <div className="model-header">
                    <span className="model-feature">{model.feature}</span>
                    <span className={`model-status ${model.is_active ? 'active' : 'inactive'}`}>
                      {model.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="model-provider">{model.provider}</div>
                  <div className="model-name">{model.model_name}</div>
                  <div className="model-params">
                    <span>Temp: {model.temperature}</span>
                    <span>Max: {model.max_tokens}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prompts Tab */}
      {activeTab === 'prompts' && (
        <div className="panel">
          <h2 className="panel-title">System Prompts</h2>
          {promptsLoading ? (
            <div className="loading">Loading prompts...</div>
          ) : (
            <div className="prompts-list">
              {prompts?.prompts.map((prompt) => (
                <div key={prompt.id} className="prompt-card">
                  <div className="prompt-header">
                    <span className="prompt-name">{prompt.name}</span>
                    <span className="prompt-feature">{prompt.feature}</span>
                    <span className={`prompt-status ${prompt.is_production ? 'production' : 'draft'}`}>
                      {prompt.is_production ? 'Production' : 'Draft'}
                    </span>
                  </div>
                  <div className="prompt-meta">
                    Version {prompt.version} | Used {prompt.usage_count} times
                  </div>
                  <div className="prompt-preview">
                    {prompt.system_prompt.substring(0, 150)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="panel">
          <h2 className="panel-title">Recommendation Rules</h2>
          {rulesLoading ? (
            <div className="loading">Loading rules...</div>
          ) : (
            <div className="rules-list">
              {rules?.rules.map((rule) => (
                <div key={rule.id} className="rule-card">
                  <div className="rule-header">
                    <span className={`rule-status ${rule.is_enabled ? 'enabled' : 'disabled'}`}>
                      {rule.is_enabled ? '✓' : '✗'}
                    </span>
                    <span className="rule-name">{rule.name}</span>
                    <span className="rule-priority">Priority: {rule.priority}</span>
                  </div>
                  <div className="rule-type">{rule.rule_type}</div>
                  <div className="rule-description">{rule.description}</div>
                  <div className="rule-meta">
                    Confidence: {(rule.min_confidence_score * 100).toFixed(0)}% |
                    {rule.require_approval ? ' Requires approval' : ' Auto-apply'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Budgets Tab */}
      {activeTab === 'budgets' && (
        <div className="panel">
          <h2 className="panel-title">Cost Budgets</h2>
          {budgetsLoading ? (
            <div className="loading">Loading budgets...</div>
          ) : (
            <div className="budgets-grid">
              {budgets?.budgets.map((budget) => {
                const dailyPercent = budget.daily_budget_usd
                  ? (budget.current_daily_spend / budget.daily_budget_usd) * 100
                  : 0;
                const monthlyPercent = budget.monthly_budget_usd
                  ? (budget.current_monthly_spend / budget.monthly_budget_usd) * 100
                  : 0;

                return (
                  <div key={budget.id} className="budget-card">
                    <div className="budget-scope">
                      {budget.scope_type}: {budget.scope_id || 'All'}
                    </div>
                    <div className="budget-row">
                      <span className="budget-label">Daily</span>
                      <div className="budget-bar-container">
                        <div
                          className={`budget-bar ${dailyPercent > 80 ? 'warning' : ''}`}
                          style={{ width: `${Math.min(dailyPercent, 100)}%` }}
                        />
                      </div>
                      <span className="budget-value">
                        ${budget.current_daily_spend.toFixed(2)} / ${budget.daily_budget_usd}
                      </span>
                    </div>
                    <div className="budget-row">
                      <span className="budget-label">Monthly</span>
                      <div className="budget-bar-container">
                        <div
                          className={`budget-bar ${monthlyPercent > 80 ? 'warning' : ''}`}
                          style={{ width: `${Math.min(monthlyPercent, 100)}%` }}
                        />
                      </div>
                      <span className="budget-value">
                        ${budget.current_monthly_spend.toFixed(2)} / ${budget.monthly_budget_usd}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .ai-page { max-width: 1400px; }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--admin-border);
          padding-bottom: 8px;
        }
        .tab-btn {
          padding: 8px 16px;
          background: transparent;
          border: none;
          color: var(--admin-text-muted);
          font-size: 14px;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.15s ease;
        }
        .tab-btn:hover {
          background: var(--admin-inner-bg);
          color: var(--admin-text);
        }
        .tab-btn.active {
          background: rgba(16, 185, 129, 0.15);
          color: var(--admin-accent);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .panel {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .panel-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .loading {
          text-align: center;
          color: var(--admin-text-muted);
          padding: 40px;
        }
        .providers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .provider-card {
          background: var(--admin-inner-bg);
          border-radius: 8px;
          padding: 16px;
        }
        .provider-name {
          font-weight: 600;
          color: var(--admin-text);
          text-transform: capitalize;
          margin-bottom: 12px;
        }
        .provider-stats {
          display: flex;
          gap: 16px;
        }
        .provider-stat {
          display: flex;
          flex-direction: column;
        }
        .provider-stat-value {
          font-weight: 700;
          color: var(--admin-accent);
        }
        .provider-stat-label {
          font-size: 11px;
          color: var(--admin-text-dim);
        }
        .models-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .model-card {
          background: var(--admin-inner-bg);
          border-radius: 8px;
          padding: 16px;
        }
        .model-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .model-feature {
          font-weight: 600;
          color: var(--admin-accent);
          text-transform: capitalize;
        }
        .model-status {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .model-status.active { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .model-status.inactive { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .model-provider {
          font-size: 13px;
          color: var(--admin-text-muted);
          text-transform: capitalize;
        }
        .model-name {
          font-weight: 500;
          color: var(--admin-text);
          margin: 4px 0;
        }
        .model-params {
          font-size: 12px;
          color: var(--admin-text-dim);
          display: flex;
          gap: 12px;
        }
        .prompts-list, .rules-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .prompt-card, .rule-card {
          background: var(--admin-inner-bg);
          border-radius: 8px;
          padding: 16px;
        }
        .prompt-header, .rule-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .prompt-name, .rule-name {
          font-weight: 600;
          color: var(--admin-text);
        }
        .prompt-feature, .rule-type {
          font-size: 12px;
          color: var(--admin-text-muted);
        }
        .prompt-status {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
          margin-left: auto;
        }
        .prompt-status.production { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .prompt-status.draft { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .prompt-meta, .rule-meta {
          font-size: 12px;
          color: var(--admin-text-dim);
          margin-bottom: 8px;
        }
        .prompt-preview {
          font-size: 13px;
          color: var(--admin-text-muted);
          line-height: 1.5;
        }
        .rule-status {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        .rule-status.enabled { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .rule-status.disabled { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .rule-priority {
          font-size: 12px;
          color: var(--admin-text-dim);
          margin-left: auto;
        }
        .rule-description {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .budgets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }
        .budget-card {
          background: var(--admin-inner-bg);
          border-radius: 8px;
          padding: 16px;
        }
        .budget-scope {
          font-weight: 600;
          color: var(--admin-text);
          text-transform: capitalize;
          margin-bottom: 12px;
        }
        .budget-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .budget-label {
          font-size: 12px;
          color: var(--admin-text-muted);
          width: 60px;
        }
        .budget-bar-container {
          flex: 1;
          height: 8px;
          background: var(--admin-border);
          border-radius: 4px;
          overflow: hidden;
        }
        .budget-bar {
          height: 100%;
          background: var(--admin-accent);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .budget-bar.warning { background: #f59e0b; }
        .budget-value {
          font-size: 12px;
          color: var(--admin-text);
          min-width: 120px;
          text-align: right;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 16px;
          }
          .page-title { font-size: 20px; }
          .tabs {
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 16px;
          }
          .tab-btn {
            padding: 6px 12px;
            font-size: 13px;
          }
          .panel { padding: 16px; margin-bottom: 16px; }
          .stats-grid { gap: 12px; }
          .providers-grid { gap: 12px; }
          .budget-row { flex-wrap: wrap; gap: 8px; }
          .budget-label { width: 100%; }
          .budget-value { min-width: auto; width: 100%; text-align: left; }
        }
      `}</style>
    </div>
  );
}
