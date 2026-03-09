'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, MessageSquare, Trash2, ChevronDown } from 'lucide-react';

interface ChatHistory {
  id: string;
  title: string;
  timestamp: Date;
  messageCount: number;
}

interface Campaign {
  id: string;
  name: string;
  platform: 'google' | 'meta';
}

interface RecommendationItem {
  id: string;
  title: string;
  severity: string;
}

interface ContextSidebarProps {
  chatHistory: ChatHistory[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  contextType: string;
  onContextTypeChange: (type: string) => void;
  selectedCampaignId: string | null;
  onCampaignChange: (campaignId: string | null) => void;
  campaigns: Campaign[];
  recommendations?: RecommendationItem[];
  selectedRecommendationId?: string | null;
  onRecommendationChange?: (recId: string | null) => void;
}

const contextOptions = [
  { id: 'general', label: 'General', icon: '💬', description: 'Ask anything about your ads' },
  { id: 'campaigns', label: 'Campaigns', icon: '📢', description: 'Analyze campaign performance' },
  { id: 'analytics', label: 'Analytics', icon: '📈', description: 'Deep dive into metrics' },
  { id: 'keywords', label: 'Keywords', icon: '🔑', description: 'Keyword optimization' },
  { id: 'recommendations', label: 'AI Recommendations', icon: '🤖', description: 'Understand AI suggestions' },
];

export default function ContextSidebar({
  chatHistory,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  contextType,
  onContextTypeChange,
  selectedCampaignId,
  onCampaignChange,
  campaigns,
  recommendations = [],
  selectedRecommendationId,
  onRecommendationChange,
}: ContextSidebarProps) {
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const [showRecommendationDropdown, setShowRecommendationDropdown] = useState(false);
  const contextDropdownRef = useRef<HTMLDivElement>(null);
  const campaignDropdownRef = useRef<HTMLDivElement>(null);
  const recommendationDropdownRef = useRef<HTMLDivElement>(null);

  const activeContext = contextOptions.find(c => c.id === contextType) || contextOptions[0];
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const selectedRecommendation = recommendations.find(r => r.id === selectedRecommendationId);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextDropdownRef.current && !contextDropdownRef.current.contains(event.target as Node)) {
        setShowContextDropdown(false);
      }
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target as Node)) {
        setShowCampaignDropdown(false);
      }
      if (recommendationDropdownRef.current && !recommendationDropdownRef.current.contains(event.target as Node)) {
        setShowRecommendationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="context-sidebar">
      {/* New Chat Button */}
      <div className="sidebar-section">
        <button className="new-chat-btn" onClick={onNewChat}>
          <Plus size={18} />
          New Chat
        </button>
      </div>

      {/* Context Selector */}
      <div className="sidebar-section context-section">
        <div className="section-label">Context</div>
        <div className="dropdown-wrapper" ref={contextDropdownRef}>
          <button
            className="dropdown-trigger"
            onClick={() => setShowContextDropdown(!showContextDropdown)}
          >
            <span className="dropdown-icon">{activeContext.icon}</span>
            <span className="dropdown-text">{activeContext.label}</span>
            <ChevronDown size={16} className={`dropdown-arrow ${showContextDropdown ? 'open' : ''}`} />
          </button>
          {showContextDropdown && (
            <div className="dropdown-menu">
              {contextOptions.map((option) => (
                <button
                  key={option.id}
                  className={`dropdown-item ${contextType === option.id ? 'active' : ''}`}
                  onClick={() => {
                    onContextTypeChange(option.id);
                    setShowContextDropdown(false);
                  }}
                >
                  <span className="dropdown-item-icon">{option.icon}</span>
                  <div className="dropdown-item-content">
                    <div className="dropdown-item-label">{option.label}</div>
                    <div className="dropdown-item-desc">{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Campaign Selector (shown for campaigns context) */}
      {contextType === 'campaigns' && (
        <div className="sidebar-section campaign-section">
          <div className="section-label">Campaign</div>
          <div className="dropdown-wrapper" ref={campaignDropdownRef}>
            <button
              className="dropdown-trigger"
              onClick={() => setShowCampaignDropdown(!showCampaignDropdown)}
            >
              <span className="dropdown-icon">
                {selectedCampaign ? (selectedCampaign.platform === 'google' ? '🔵' : '🔷') : '📢'}
              </span>
              <span className="dropdown-text">
                {selectedCampaign?.name || 'All Campaigns'}
              </span>
              <ChevronDown size={16} className={`dropdown-arrow ${showCampaignDropdown ? 'open' : ''}`} />
            </button>
            {showCampaignDropdown && (
              <div className="dropdown-menu">
                <button
                  className={`dropdown-item ${!selectedCampaignId ? 'active' : ''}`}
                  onClick={() => {
                    onCampaignChange(null);
                    setShowCampaignDropdown(false);
                  }}
                >
                  <span className="dropdown-item-icon">📢</span>
                  <div className="dropdown-item-content">
                    <div className="dropdown-item-label">All Campaigns</div>
                  </div>
                </button>
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    className={`dropdown-item ${selectedCampaignId === campaign.id ? 'active' : ''}`}
                    onClick={() => {
                      onCampaignChange(campaign.id);
                      setShowCampaignDropdown(false);
                    }}
                  >
                    <span className="dropdown-item-icon">
                      {campaign.platform === 'google' ? '🔵' : '🔷'}
                    </span>
                    <div className="dropdown-item-content">
                      <div className="dropdown-item-label">{campaign.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendation Selector (shown for recommendations context) */}
      {contextType === 'recommendations' && recommendations.length > 0 && (
        <div className="sidebar-section recommendation-section">
          <div className="section-label">Recommendation</div>
          <div className="dropdown-wrapper" ref={recommendationDropdownRef}>
            <button
              className="dropdown-trigger"
              onClick={() => setShowRecommendationDropdown(!showRecommendationDropdown)}
            >
              <span className="dropdown-icon">
                {selectedRecommendation
                  ? (selectedRecommendation.severity === 'critical' ? '🚨' : selectedRecommendation.severity === 'warning' ? '⚠️' : '💡')
                  : '🤖'}
              </span>
              <span className="dropdown-text" style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {selectedRecommendation?.title || 'All Recommendations'}
              </span>
              <ChevronDown size={16} className={`dropdown-arrow ${showRecommendationDropdown ? 'open' : ''}`} />
            </button>
            {showRecommendationDropdown && (
              <div className="dropdown-menu">
                <button
                  className={`dropdown-item ${!selectedRecommendationId ? 'active' : ''}`}
                  onClick={() => {
                    onRecommendationChange?.(null);
                    setShowRecommendationDropdown(false);
                  }}
                >
                  <span className="dropdown-item-icon">🤖</span>
                  <div className="dropdown-item-content">
                    <div className="dropdown-item-label">All Recommendations</div>
                  </div>
                </button>
                {recommendations.map((rec) => (
                  <button
                    key={rec.id}
                    className={`dropdown-item ${selectedRecommendationId === rec.id ? 'active' : ''}`}
                    onClick={() => {
                      onRecommendationChange?.(rec.id);
                      setShowRecommendationDropdown(false);
                    }}
                  >
                    <span className="dropdown-item-icon">
                      {rec.severity === 'critical' ? '🚨' : rec.severity === 'warning' ? '⚠️' : '💡'}
                    </span>
                    <div className="dropdown-item-content">
                      <div className="dropdown-item-label" style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '200px'
                      }}>
                        {rec.title}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat History */}
      <div className="sidebar-section history-section">
        <div className="section-label">History</div>
        <div className="chat-history">
          {chatHistory.length === 0 ? (
            <div className="history-empty">
              <MessageSquare size={24} />
              <span>No chat history yet</span>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`history-item ${activeChatId === chat.id ? 'active' : ''}`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="history-item-content">
                  <div className="history-item-title">{chat.title}</div>
                  <div className="history-item-meta">
                    {chat.messageCount} messages · {formatTime(chat.timestamp)}
                  </div>
                </div>
                <button
                  className="history-item-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .context-sidebar {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--surface);
          border-left: 1px solid var(--border-default);
          width: 320px;
          flex-shrink: 0;
          overflow: hidden;
        }

        .sidebar-section {
          padding: 16px;
          border-bottom: 1px solid var(--border-default);
          position: relative;
        }

        .context-section {
          z-index: 30;
        }

        .campaign-section {
          z-index: 20;
        }

        .recommendation-section {
          z-index: 20;
        }

        .history-section {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          z-index: 1;
        }

        .section-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-tertiary);
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }

        .new-chat-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, hsl(217 90% 50%), hsl(252 90% 65%));
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow:
            0 0.375em 0.5em hsla(0, 0%, 100%, 0.2) inset,
            0 -0.25em 0.25em hsla(0, 0%, 0%, 0.1) inset,
            0 0.5em 1.5em hsla(252, 90%, 65%, 0.3);
        }

        .new-chat-btn:hover {
          box-shadow:
            0 0.375em 0.5em hsla(0, 0%, 100%, 0.2) inset,
            0 -0.25em 0.25em hsla(0, 0%, 0%, 0.1) inset,
            0 0.75em 2em hsla(252, 90%, 65%, 0.4);
          transform: translateY(-1px);
        }

        .dropdown-wrapper {
          position: relative;
          z-index: 20;
        }

        .dropdown-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          background: var(--surface-secondary);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .dropdown-trigger:hover {
          border-color: hsl(252 90% 65%);
        }

        .dropdown-icon {
          font-size: 16px;
        }

        .dropdown-text {
          flex: 1;
          font-size: 14px;
          color: var(--text-primary);
        }

        .dropdown-arrow {
          color: var(--text-tertiary);
          transition: transform 0.2s;
        }

        .dropdown-arrow.open {
          transform: rotate(180deg);
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background-color: var(--bg-primary);
          border: 1px solid var(--border-default);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          z-index: 100;
          overflow: hidden;
          animation: slideDown 0.15s ease;
          max-height: 280px;
          overflow-y: auto;
        }

        .dropdown-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          background-color: var(--bg-primary);
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background-color 0.15s;
        }

        .dropdown-item:hover {
          background-color: var(--surface-secondary);
        }

        .dropdown-item.active {
          background-color: hsla(252, 90%, 65%, 0.15);
        }

        .dropdown-item-icon {
          font-size: 16px;
          margin-top: 2px;
        }

        .dropdown-item-content {
          flex: 1;
        }

        .dropdown-item-label {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .dropdown-item-desc {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-top: 2px;
        }

        .chat-history {
          flex: 1;
          overflow-y: auto;
          margin: 0 -16px;
          padding: 0 8px;
        }

        .history-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 32px 16px;
          color: var(--text-tertiary);
          font-size: 13px;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          margin: 2px 0;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .history-item:hover {
          background: var(--surface-secondary);
        }

        .history-item.active {
          background: hsla(252, 90%, 65%, 0.1);
        }

        .history-item-content {
          flex: 1;
          min-width: 0;
        }

        .history-item-title {
          font-size: 13px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .history-item-meta {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 2px;
        }

        .history-item-delete {
          display: none;
          padding: 4px;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: var(--text-tertiary);
          cursor: pointer;
        }

        .history-item:hover .history-item-delete {
          display: flex;
        }

        .history-item-delete:hover {
          color: var(--error);
          background: rgba(239, 68, 68, 0.1);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
