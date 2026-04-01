'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Sparkles, Headset } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface RecommendationContext {
  id: string;
  title: string;
  description: string;
  severity: string;
  type: string;
  confidence: number;
  entity: string;
  campaign: string;
  impact: {
    monthly_savings?: number;
    potential_gain?: number;
    summary: string;
  };
  rule_id: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  context?: {
    type: string;
    campaignId?: string;
    campaignName?: string;
  };
  recommendationContext?: RecommendationContext | null;
  onClearRecommendationContext?: () => void;
}

export default function ChatPanel({ messages, onSendMessage, isLoading, context, recommendationContext, onClearRecommendationContext }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Dynamic suggestions based on context
  const getSuggestions = () => {
    // If we have a specific recommendation context, show relevant questions
    if (recommendationContext) {
      return [
        `Why did you recommend "${recommendationContext.title}"?`,
        `What data triggered this ${recommendationContext.severity} recommendation?`,
        `What happens if I don't apply this recommendation?`,
      ];
    }

    switch (context?.type) {
      case 'campaigns':
        return [
          'How is my campaign performing?',
          'What keywords should I add?',
          'How can I reduce CPC?',
        ];
      case 'analytics':
        return [
          'Summarize my performance this week',
          'Which campaigns are underperforming?',
          'Compare this month vs last month',
        ];
      case 'keywords':
        return [
          'Find negative keyword opportunities',
          'Which keywords have low quality score?',
          'Suggest new keywords to target',
        ];
      case 'recommendations':
        return [
          'Explain the top recommendation',
          'What actions should I prioritize?',
          'How much can I save this month?',
        ];
      default:
        return [
          'How can I improve my ROAS?',
          'Analyze my campaign performance',
          'What should I optimize first?',
        ];
    }
  };

  const followUpSuggestions = [
    'Create in-depth analysis',
    'Identify actionable tasks',
  ];

  const handleSubmit = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;
    onSendMessage(messageText);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-panel">
      {messages.length === 0 ? (
        /* Welcome Screen */
        <div className="chat-welcome">
          <div className="chat-icon-wrapper">
            <div className="chat-icon chat-icon-gradient">
              <Sparkles className="chat-icon-svg" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="chat-title">
            {recommendationContext
              ? 'Ask about this recommendation'
              : context?.campaignName
                ? `Analyzing: ${context.campaignName}`
                : context?.type
                  ? `Ask about your ${context.type}`
                  : 'How can I help you today?'
            }
          </h1>

          {/* Recommendation Context Card */}
          {recommendationContext && (
            <div className="rec-context-card">
              <div className="rec-context-header">
                <span className={`rec-severity rec-severity-${recommendationContext.severity}`}>
                  {recommendationContext.severity === 'critical' ? '🚨' : recommendationContext.severity === 'warning' ? '⚠️' : '💡'}
                  {recommendationContext.severity.toUpperCase()}
                </span>
                <span className="rec-confidence">{recommendationContext.confidence}% confidence</span>
                {onClearRecommendationContext && (
                  <button className="rec-close" onClick={onClearRecommendationContext} aria-label="Clear">×</button>
                )}
              </div>
              <div className="rec-title">{recommendationContext.title}</div>
              <div className="rec-description">{recommendationContext.description}</div>
              <div className="rec-meta">
                <span>Affects: <strong>{recommendationContext.entity}</strong></span>
                {recommendationContext.campaign && <span> in {recommendationContext.campaign}</span>}
              </div>
              {recommendationContext.impact.monthly_savings && (
                <div className="rec-impact">
                  Potential savings: <strong>${recommendationContext.impact.monthly_savings}/month</strong>
                </div>
              )}
            </div>
          )}
          <div className="chat-suggestions-box">
            {getSuggestions().map((suggestion, i) => (
              <button
                key={i}
                className="chat-suggestion"
                onClick={() => handleSubmit(suggestion)}
              >
                {suggestion}
              </button>
            ))}
            <div className="chat-input-wrapper">
              <label className="chat-label" htmlFor="chat-input">Ask</label>
              <input
                id="chat-input"
                className="chat-input"
                type="text"
                placeholder="Ask anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                className="chat-submit"
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading}
                aria-label="Submit"
              >
                <ArrowRight className="chat-submit-icon" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Conversation View */
        <div className="chat-conversation">
          <div className="chat-message-scroller">
            <div className="chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message chat-message-${message.type}`}
                >
                  {message.type === 'ai' && (
                    <div className="chat-message-icon">
                      <div className="chat-icon chat-icon-gradient chat-icon-small">
                        <Headset className="chat-icon-svg" />
                      </div>
                    </div>
                  )}
                  <div className="chat-message-content">
                    <p className="chat-message-text">{message.content}</p>
                    {message.type === 'user' && (
                      <>
                        <div className="chat-message-bubble" />
                        <div className="chat-message-bubble chat-message-bubble-end" />
                      </>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="chat-message chat-message-ai chat-message-loading">
                  <div className="chat-message-icon">
                    <div className="chat-icon chat-icon-gradient chat-icon-small">
                      <Headset className="chat-icon-svg" />
                    </div>
                  </div>
                  <div className="chat-message-content">
                    <Loader />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Box */}
          <div className="chat-input-box">
            <div className="chat-suggestion-tags">
              {followUpSuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  className="chat-suggestion-tag"
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSubmit(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="chat-textarea-wrapper">
              <textarea
                ref={inputRef}
                className="chat-textarea"
                placeholder="Ask anything..."
                value={input}
                disabled={isLoading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="chat-submit chat-submit-textarea"
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading}
                aria-label="Submit"
              >
                <ArrowRight className="chat-submit-icon" />
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .chat-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          overflow: hidden;
        }

        .chat-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: auto;
          padding: 3em 1.5em;
          max-width: 42em;
          width: 100%;
          height: 100%;
        }

        .chat-icon-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 1em;
        }

        .chat-icon {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 4em;
          height: 4em;
          position: relative;
        }

        .chat-icon-gradient {
          background: linear-gradient(135deg, hsl(292 90% 60%) 25%, hsl(217 90% 60%) 60%, hsl(217 90% 20%));
          box-shadow: 0 0.75em 2em hsla(0, 0%, 0%, 0.3);
        }

        .chat-icon-gradient::before {
          content: "";
          position: absolute;
          inset: 10%;
          border-radius: 50%;
          background: linear-gradient(hsla(0, 0%, 100%, 0.5), hsla(0, 0%, 0%, 0.2), hsla(0, 0%, 0%, 0) 50%);
        }

        .chat-icon-svg {
          color: white;
          width: 50%;
          height: 50%;
          position: relative;
          z-index: 1;
        }

        .chat-icon-small {
          width: 2.25em;
          height: 2.25em;
        }

        .chat-title {
          font-size: 1.25em;
          font-weight: 500;
          line-height: 1.4;
          text-align: center;
          margin-bottom: 2rem;
          color: var(--text-primary);
        }

        .chat-suggestions-box {
          background: var(--surface-secondary);
          border-radius: 1.5em;
          box-shadow: 0 4.5em 4.5em hsla(0, 0%, 0%, 0.2);
          display: flex;
          flex-direction: column;
          gap: 0.75em;
          padding: 1em;
          width: 100%;
        }

        .chat-suggestion {
          background: transparent;
          border-radius: 0.75em;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.75em 1em;
          text-align: start;
          border: 1px solid var(--border-default);
          transition: all 0.3s;
          font-size: 14px;
          position: relative;
          z-index: 0;
        }

        .chat-suggestion::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(90deg, hsl(217 90% 70%), hsl(217 90% 50%) 33%, hsl(292 90% 70%));
          box-shadow: 0 0.375em 0.5em hsla(0, 0%, 100%, 0.2) inset, 0 -0.25em 0.25em hsla(0, 0%, 0%, 0.1) inset;
          opacity: 0;
          transition: opacity 0.3s;
          z-index: -1;
        }

        .chat-suggestion:hover {
          color: white;
          border-color: transparent;
          box-shadow: 0 0.75em 1em hsla(217, 90%, 40%, 0.2);
        }

        .chat-suggestion:hover::before {
          opacity: 1;
        }

        .chat-input-wrapper {
          position: relative;
          width: 100%;
          margin-top: 0.5em;
        }

        .chat-label {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }

        .chat-input {
          background: var(--surface);
          border-radius: 1em;
          border: 1px solid var(--border-default);
          box-shadow: 0 0.125em 0.125em hsla(0, 0%, 0%, 0.1);
          padding: 1em;
          padding-right: 3.5em;
          width: 100%;
          outline: none;
          font-size: 14px;
          color: var(--text-primary);
        }

        .chat-input::placeholder {
          color: var(--text-tertiary);
        }

        .chat-submit {
          background: var(--text-primary);
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          top: 50%;
          right: 0.5em;
          transform: translateY(-50%);
          width: 2.25em;
          height: 2.25em;
          transition: all 0.2s;
          box-shadow: 0 0.375em 0.25em hsla(0, 0%, 100%, 0.2) inset, 0 1em 1.5em hsla(0, 0%, 0%, 0.2);
        }

        .chat-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chat-submit:not(:disabled):hover {
          box-shadow: 0 0.375em 0.25em hsla(0, 0%, 100%, 0.3) inset, 0 1em 1.5em hsla(0, 0%, 0%, 0.3);
        }

        .chat-submit-icon {
          color: var(--bg-primary);
          width: 1.25em;
          height: 1.25em;
        }

        /* Conversation View */
        .chat-conversation {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .chat-message-scroller {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1.5em 0;
        }

        .chat-messages {
          display: flex;
          flex-direction: column;
          max-width: 56em;
          margin: 0 auto;
          width: 100%;
          padding: 0 1em;
        }

        .chat-message {
          display: flex;
          flex-shrink: 0;
          gap: 0.75em;
          margin: 0.75em 0;
          min-width: 0;
        }

        .chat-message-user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .chat-message-ai {
          align-self: flex-start;
        }

        .chat-message-icon {
          flex-shrink: 0;
        }

        .chat-message-content {
          border-radius: 1.75em;
          padding: 1em 1.25em;
          padding-right: 1.5em;
          position: relative;
          max-width: 75%;
          line-height: 1.5;
          min-width: 3.5em;
          animation: messageAppear 0.3s cubic-bezier(0.65, 0, 0.35, 1);
        }

        .chat-message-text {
          margin: 0;
          font-size: 14px;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .chat-message-user .chat-message-content {
          background: linear-gradient(135deg, hsl(217 90% 50%), hsl(252 90% 65%) calc(100% - 1.25em));
          color: white;
          text-shadow: 0 0 0.25em hsla(0, 0%, 0%, 0.3);
          box-shadow:
            0 0.375em 0.5em hsla(0, 0%, 100%, 0.2) inset,
            0 -0.25em 0.25em hsla(0, 0%, 0%, 0.1) inset,
            0 1.5em 1.5em hsla(252, 90%, 65%, 0.2);
          transform-origin: calc(100% + 0.75em) 100%;
          min-width: fit-content;
        }

        .chat-message-ai .chat-message-content {
          background: var(--surface-secondary);
          color: var(--text-primary);
          box-shadow: 0 1.5em 1.5em hsla(0, 0%, 0%, 0.1);
          transform-origin: 0 0;
          border: 1px solid var(--border-default);
        }

        .chat-message-bubble {
          background: hsl(252 90% 65%);
          border-radius: 50%;
          position: absolute;
          bottom: 0.25em;
          right: -0.125em;
          width: 1.25em;
          height: 1.25em;
        }

        .chat-message-bubble-end {
          right: -0.5em;
          bottom: 0;
          width: 0.5em;
          height: 0.5em;
        }

        .chat-message-loading {
          animation: iconAppear 0.6s ease-out;
        }

        /* Input Box */
        .chat-input-box {
          background: var(--surface-secondary);
          border-radius: 1.5em 1.5em 0 0;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.05);
          padding: 1em;
          margin: 0 auto 1.5em;
          max-width: 56em;
          width: calc(100% - 3em);
          position: relative;
          flex-shrink: 0;
        }

        .chat-input-box::before {
          content: "";
          position: absolute;
          inset: auto 0 100% 0;
          left: -1.5em;
          right: -0.625em;
          height: 1.5em;
          background: var(--bg-primary);
          mask-image: linear-gradient(hsla(0, 0%, 0%, 0), hsla(0, 0%, 0%, 1));
          pointer-events: none;
        }

        .chat-suggestion-tags {
          display: flex;
          gap: 0.5em;
          flex-wrap: wrap;
          margin-bottom: 0.75em;
        }

        .chat-suggestion-tag {
          background: var(--surface);
          border-radius: 0.375em;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25em 0.5em;
          font-size: 13px;
          border: none;
          transition: all 0.2s;
        }

        .chat-suggestion-tag:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .chat-suggestion-tag:not(:disabled):hover {
          background: var(--text-primary);
          color: var(--bg-primary);
        }

        .chat-textarea-wrapper {
          position: relative;
        }

        .chat-textarea {
          background: var(--surface);
          border-radius: 1em;
          border: 1px solid var(--border-default);
          box-shadow: 0 0.125em 0.125em hsla(0, 0%, 0%, 0.1);
          display: block;
          padding: 1em;
          padding-right: 3.5em;
          outline: none;
          resize: none;
          min-height: 3em;
          width: 100%;
          font-size: 14px;
          color: var(--text-primary);
          font-family: inherit;
        }

        .chat-textarea::placeholder {
          color: var(--text-tertiary);
        }

        .chat-submit-textarea {
          bottom: 0.5em;
          top: auto;
          transform: none;
        }

        @keyframes messageAppear {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes iconAppear {
          from, 50% {
            opacity: 0;
            transform: translateY(33%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Recommendation Context Card */
        .rec-context-card {
          width: 100%;
          background: var(--surface-secondary);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          text-align: left;
        }

        .rec-context-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .rec-severity {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .rec-severity-critical {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .rec-severity-warning {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .rec-severity-opportunity {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .rec-confidence {
          font-size: 12px;
          color: var(--text-tertiary);
          font-family: var(--font-mono);
        }

        .rec-close {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 20px;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }

        .rec-close:hover {
          color: var(--text-primary);
        }

        .rec-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .rec-description {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 10px;
        }

        .rec-meta {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-bottom: 8px;
        }

        .rec-meta strong {
          color: hsl(252 90% 65%);
        }

        .rec-impact {
          font-size: 13px;
          color: var(--success);
          font-weight: 500;
        }

        .rec-impact strong {
          color: var(--success);
        }

        /* Mobile Styles */
        @media (max-width: 767px) {
          .chat-welcome {
            padding: 1.5em 1em;
            justify-content: flex-start;
            padding-top: 2em;
          }

          .chat-icon {
            width: 3em;
            height: 3em;
          }

          .chat-icon-wrapper {
            margin-bottom: 0.75em;
          }

          .chat-title {
            font-size: 1.1em;
            margin-bottom: 1.25rem;
          }

          .chat-suggestions-box {
            border-radius: 1em;
            padding: 0.75em;
            gap: 0.5em;
            box-shadow: 0 2em 2em hsla(0, 0%, 0%, 0.15);
          }

          .chat-suggestion {
            padding: 0.625em 0.875em;
            font-size: 13px;
          }

          .chat-input {
            padding: 0.875em;
            padding-right: 3em;
            font-size: 16px; /* Prevent zoom on iOS */
          }

          .chat-submit {
            width: 2em;
            height: 2em;
          }

          .rec-context-card {
            padding: 12px;
            margin-bottom: 12px;
          }

          .rec-title {
            font-size: 14px;
          }

          .rec-description {
            font-size: 12px;
          }

          /* Conversation View Mobile */
          .chat-conversation {
            padding-bottom: 0;
          }

          .chat-message-scroller {
            padding: 1em 0;
          }

          .chat-messages {
            padding: 0 0.75em;
          }

          .chat-message {
            gap: 0.5em;
            margin: 0.5em 0;
          }

          .chat-message-content {
            max-width: 85%;
            padding: 0.75em 1em;
            border-radius: 1.25em;
          }

          .chat-message-text {
            font-size: 13px;
          }

          .chat-icon-small {
            width: 1.75em;
            height: 1.75em;
          }

          .chat-input-box {
            border-radius: 1em 1em 0 0;
            padding: 0.75em;
            margin: 0;
            width: 100%;
            max-width: none;
          }

          .chat-suggestion-tags {
            gap: 0.375em;
            margin-bottom: 0.5em;
          }

          .chat-suggestion-tag {
            font-size: 12px;
            padding: 0.25em 0.5em;
          }

          .chat-textarea {
            padding: 0.75em;
            padding-right: 3em;
            font-size: 16px; /* Prevent zoom on iOS */
            min-height: 2.5em;
          }

          .chat-submit-textarea {
            bottom: 0.375em;
            right: 0.375em;
          }
        }
      `}</style>
    </div>
  );
}

function Loader() {
  return (
    <div className="chat-loader">
      <svg
        className="chat-loader-svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path className="chat-loader-line line-1" d="m4.9 4.9 2.9 2.9" />
        <path className="chat-loader-line line-2" d="M2 12h4" />
        <path className="chat-loader-line line-3" d="m4.9 19.1 2.9-2.9" />
        <path className="chat-loader-line line-4" d="M12 18v4" />
        <path className="chat-loader-line line-5" d="m16.2 16.2 2.9 2.9" />
        <path className="chat-loader-line line-6" d="M18 12h4" />
        <path className="chat-loader-line line-7" d="m16.2 7.8 2.9-2.9" />
        <path className="chat-loader-line line-8" d="M12 2v4" />
      </svg>
      <style jsx>{`
        .chat-loader {
          margin: 0.375em 0;
        }
        .chat-loader-svg {
          width: 1.5em;
          height: 1.5em;
          color: hsl(252 90% 65%);
        }
        .chat-loader-line {
          animation: loaderLine 1s linear infinite;
        }
        .line-1 { animation-delay: -0.125s; }
        .line-2 { animation-delay: -0.25s; }
        .line-3 { animation-delay: -0.375s; }
        .line-4 { animation-delay: -0.5s; }
        .line-5 { animation-delay: -0.625s; }
        .line-6 { animation-delay: -0.75s; }
        .line-7 { animation-delay: -0.875s; }
        .line-8 { animation-delay: -1s; }
        @keyframes loaderLine {
          from, 67%, to {
            opacity: 0.2;
          }
          33% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
