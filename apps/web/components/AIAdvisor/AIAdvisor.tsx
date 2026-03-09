'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Sparkles, ChevronDown } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AIAdvisorProps {
  context?: {
    page?: string;
    campaignId?: string;
    recommendationId?: string;
  };
}

export default function AIAdvisor({ context }: AIAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Listen for global event to open chat (from header button)
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('openAIAdvisor', handleOpenChat);
    return () => window.removeEventListener('openAIAdvisor', handleOpenChat);
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
  };

  const suggestions = [
    'Why is my CTR low?',
    'How to improve ROAS?',
    'Explain this recommendation',
  ];

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
      const response = await fetch(`${API_URL}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          context: context,
          history: messages.slice(-10).map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        type: 'ai',
        content: data.response || data.message || 'I apologize, I could not process that request.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Auto-focus input after response
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Robot Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ai-advisor-fab"
        aria-label="AI Advisor"
      >
        {isOpen ? (
          <ChevronDown size={28} color="white" />
        ) : (
          <RobotIcon />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="ai-advisor-panel">
          {/* Header */}
          <div className="ai-advisor-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="ai-advisor-header-icon">
                <Sparkles size={20} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'white', fontSize: '15px' }}>
                  AI Advisor
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                  Ask me anything about your ads
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {messages.length > 0 && (
                <button
                  onClick={handleNewChat}
                  className="ai-advisor-new-chat"
                  title="Start new chat"
                >
                  New
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="ai-advisor-close"
              >
                <X size={18} color="white" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-advisor-messages">
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div className="ai-advisor-welcome-icon">
                  <Sparkles size={28} color="#10B981" />
                </div>
                <div className="ai-advisor-welcome-title">
                  How can I help you today?
                </div>
                <div className="ai-advisor-welcome-subtitle">
                  Ask about your campaigns, recommendations, or ad performance
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(suggestion)}
                      className="ai-advisor-suggestion"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`ai-advisor-message ${message.type === 'user' ? 'ai-advisor-message-user' : 'ai-advisor-message-ai'}`}
                  >
                    <div className={`ai-advisor-bubble ${message.type === 'user' ? 'ai-advisor-bubble-user' : 'ai-advisor-bubble-ai'}`}>
                      {message.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="ai-advisor-message ai-advisor-message-ai">
                    <div className="ai-advisor-bubble ai-advisor-bubble-ai">
                      <LoadingDots />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="ai-advisor-input-area">
            <div className="ai-advisor-input-wrapper">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                disabled={isLoading}
                className="ai-advisor-input"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={`ai-advisor-send ${input.trim() && !isLoading ? 'ai-advisor-send-active' : ''}`}
              >
                <Send size={18} color={input.trim() && !isLoading ? 'white' : '#888'} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .ai-advisor-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          transition: all 0.3s ease;
        }
        .ai-advisor-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(16, 185, 129, 0.5);
        }

        .ai-advisor-panel {
          position: fixed;
          bottom: 100px;
          right: 24px;
          width: 380px;
          max-height: 550px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          z-index: 999;
          overflow: hidden;
          animation: slideUp 0.3s ease;
          /* Light mode: white background */
          background: #ffffff;
          box-shadow: 0 10px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08);
        }

        /* Dark mode */
        [data-theme="dark"] .ai-advisor-panel,
        .dark .ai-advisor-panel {
          background: #1a1a1a;
          box-shadow: 0 10px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
        }

        .ai-advisor-header {
          padding: 16px 20px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ai-advisor-header-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-advisor-new-chat {
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 500;
          color: white;
          cursor: pointer;
        }
        .ai-advisor-new-chat:hover {
          background: rgba(255,255,255,0.3);
        }

        .ai-advisor-close {
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .ai-advisor-close:hover {
          background: rgba(255,255,255,0.3);
        }

        .ai-advisor-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 350px;
        }

        .ai-advisor-welcome-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 16px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-advisor-welcome-title {
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #1a1a1a;
        }
        [data-theme="dark"] .ai-advisor-welcome-title,
        .dark .ai-advisor-welcome-title {
          color: #ffffff;
        }

        .ai-advisor-welcome-subtitle {
          font-size: 13px;
          margin-bottom: 16px;
          color: #666;
        }
        [data-theme="dark"] .ai-advisor-welcome-subtitle,
        .dark .ai-advisor-welcome-subtitle {
          color: #888;
        }

        .ai-advisor-suggestion {
          padding: 10px 14px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 10px;
          color: #10B981;
          font-size: 13px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .ai-advisor-suggestion:hover {
          background: rgba(16, 185, 129, 0.2);
        }

        .ai-advisor-message {
          display: flex;
        }
        .ai-advisor-message-user {
          justify-content: flex-end;
        }
        .ai-advisor-message-ai {
          justify-content: flex-start;
        }

        .ai-advisor-bubble {
          max-width: 85%;
          padding: 12px 16px;
          font-size: 14px;
          line-height: 1.5;
        }

        .ai-advisor-bubble-user {
          border-radius: 16px 16px 4px 16px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
        }

        .ai-advisor-bubble-ai {
          border-radius: 16px 16px 16px 4px;
          /* Light mode: light gray background */
          background: #f3f4f6;
          color: #1a1a1a;
        }
        [data-theme="dark"] .ai-advisor-bubble-ai,
        .dark .ai-advisor-bubble-ai {
          background: rgba(255,255,255,0.1);
          color: #ffffff;
        }

        .ai-advisor-input-area {
          padding: 12px 16px;
          /* Light mode */
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        [data-theme="dark"] .ai-advisor-input-area,
        .dark .ai-advisor-input-area {
          border-top: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.2);
        }

        .ai-advisor-input-wrapper {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .ai-advisor-input {
          flex: 1;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 14px;
          resize: none;
          outline: none;
          min-height: 44px;
          max-height: 100px;
          /* Light mode */
          background: #ffffff;
          border: 1px solid #e5e7eb;
          color: #1a1a1a;
        }
        .ai-advisor-input::placeholder {
          color: #9ca3af;
        }
        [data-theme="dark"] .ai-advisor-input,
        .dark .ai-advisor-input {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.1);
          color: #ffffff;
        }
        [data-theme="dark"] .ai-advisor-input::placeholder,
        .dark .ai-advisor-input::placeholder {
          color: #666;
        }

        .ai-advisor-send {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: none;
          cursor: not-allowed;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          /* Light mode */
          background: #e5e7eb;
        }
        [data-theme="dark"] .ai-advisor-send,
        .dark .ai-advisor-send {
          background: rgba(255,255,255,0.1);
        }

        .ai-advisor-send-active {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
          cursor: pointer !important;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

// Animated Robot Icon (smaller version)
function RobotIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
      {/* Body */}
      <ellipse cx="32" cy="44" rx="14" ry="12" fill="white" />
      <circle cx="32" cy="44" r="5" fill="#10B981" />
      <circle cx="30" cy="42" r="1.5" fill="white" />

      {/* Head */}
      <rect x="12" y="14" rx="12" width="40" height="26" fill="white" />

      {/* Face */}
      <rect x="17" y="18" rx="8" width="30" height="18" fill="#1a1a1a" />

      {/* Eyes */}
      <ellipse cx="25" cy="27" rx="3" ry="4" fill="#10B981" />
      <ellipse cx="39" cy="27" rx="3" ry="4" fill="#10B981" />

      {/* Smile */}
      <path d="M25 32 Q32 38 39 32" stroke="#10B981" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Antennae */}
      <line x1="20" y1="14" x2="16" y2="6" stroke="#d1d9e6" strokeWidth="3" strokeLinecap="round" />
      <line x1="44" y1="14" x2="48" y2="6" stroke="#d1d9e6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Loading animation
function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="ai-advisor-loading-dot"
          style={{
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
      <style jsx>{`
        .ai-advisor-loading-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
