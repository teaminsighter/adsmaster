'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatPanel from '@/components/advisor/ChatPanel';
import ContextSidebar from '@/components/advisor/ContextSidebar';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  contextType: string;
  campaignId: string | null;
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

// Mock campaigns data
const mockCampaigns = [
  { id: 'camp_1', name: 'Search - Brand', platform: 'google' as const },
  { id: 'camp_2', name: 'Search - Non-Brand', platform: 'google' as const },
  { id: 'camp_3', name: 'Performance Max', platform: 'google' as const },
  { id: 'camp_4', name: 'Summer Sale', platform: 'meta' as const },
  { id: 'camp_5', name: 'Retargeting', platform: 'meta' as const },
];

// Mock recommendations data
const mockRecommendations = [
  { id: 'rec_1', title: 'High-spend wasting keyword', severity: 'warning' },
  { id: 'rec_2', title: 'Low quality score keyword', severity: 'warning' },
  { id: 'rec_3', title: 'Budget constrained campaign', severity: 'opportunity' },
  { id: 'rec_4', title: 'Fix conversion tracking', severity: 'critical' },
  { id: 'rec_5', title: 'Add negative keywords', severity: 'opportunity' },
];

function AdvisorContent() {
  const searchParams = useSearchParams();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [contextType, setContextType] = useState('general');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendationContext, setRecommendationContext] = useState<RecommendationContext | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Handle URL params for recommendation context
  useEffect(() => {
    if (hasInitialized) return;

    const contextParam = searchParams.get('context');
    const recParam = searchParams.get('rec');

    if (contextParam === 'recommendations' && recParam) {
      try {
        const recData = JSON.parse(decodeURIComponent(recParam)) as RecommendationContext;
        setContextType('recommendations');
        setRecommendationContext(recData);
        // Set selected recommendation ID if it matches one in our list
        if (recData.id) {
          setSelectedRecommendationId(recData.id);
        }
        setHasInitialized(true);
      } catch (e) {
        console.error('Failed to parse recommendation data:', e);
      }
    }
  }, [searchParams, hasInitialized]);

  // Get active chat session
  const activeChat = chatSessions.find(s => s.id === activeChatId);
  const messages = activeChat?.messages || [];

  // Create new chat
  const handleNewChat = useCallback(() => {
    const newChat: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      contextType,
      campaignId: selectedCampaignId,
      timestamp: new Date(),
    };
    setChatSessions(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  }, [contextType, selectedCampaignId]);

  // Select existing chat
  const handleSelectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    const chat = chatSessions.find(s => s.id === chatId);
    if (chat) {
      setContextType(chat.contextType);
      setSelectedCampaignId(chat.campaignId);
    }
  }, [chatSessions]);

  // Delete chat
  const handleDeleteChat = useCallback((chatId: string) => {
    setChatSessions(prev => prev.filter(s => s.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
  }, [activeChatId]);

  // Send message
  const handleSendMessage = useCallback(async (messageText: string) => {
    // Create or get active chat
    let currentChatId = activeChatId;
    if (!currentChatId) {
      const newChat: ChatSession = {
        id: crypto.randomUUID(),
        title: messageText.slice(0, 30) + (messageText.length > 30 ? '...' : ''),
        messages: [],
        contextType,
        campaignId: selectedCampaignId,
        timestamp: new Date(),
      };
      setChatSessions(prev => [newChat, ...prev]);
      currentChatId = newChat.id;
      setActiveChatId(newChat.id);
    }

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setChatSessions(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        // Update title if first message
        const newTitle = chat.messages.length === 0
          ? messageText.slice(0, 30) + (messageText.length > 30 ? '...' : '')
          : chat.title;
        return {
          ...chat,
          title: newTitle,
          messages: [...chat.messages, userMessage],
          timestamp: new Date(),
        };
      }
      return chat;
    }));

    setIsLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
      const selectedCampaign = mockCampaigns.find(c => c.id === selectedCampaignId);

      const response = await fetch(`${API_URL}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          context: {
            page: 'advisor',
            type: contextType,
            campaignId: selectedCampaignId,
            campaignName: selectedCampaign?.name,
          },
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

      setChatSessions(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, aiMessage],
          };
        }
        return chat;
      }));
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };

      setChatSessions(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, errorMessage],
          };
        }
        return chat;
      }));
    } finally {
      setIsLoading(false);
    }
  }, [activeChatId, contextType, selectedCampaignId, messages]);

  // Build chat history for sidebar
  const chatHistory = chatSessions.map(session => ({
    id: session.id,
    title: session.title,
    timestamp: session.timestamp,
    messageCount: session.messages.length,
  }));

  // Get selected campaign name for context
  const selectedCampaign = mockCampaigns.find(c => c.id === selectedCampaignId);

  // Clear recommendation context when starting new chat or changing context
  const handleClearRecommendationContext = useCallback(() => {
    setRecommendationContext(null);
    // Clear URL params
    window.history.replaceState({}, '', '/advisor');
  }, []);

  return (
    <div className="advisor-page">
      {/* Main Chat Area */}
      <div className="advisor-main">
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          context={{
            type: contextType,
            campaignId: selectedCampaignId || undefined,
            campaignName: selectedCampaign?.name,
          }}
          recommendationContext={recommendationContext}
          onClearRecommendationContext={handleClearRecommendationContext}
        />
      </div>

      {/* Right Sidebar */}
      <ContextSidebar
        chatHistory={chatHistory}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        contextType={contextType}
        onContextTypeChange={setContextType}
        selectedCampaignId={selectedCampaignId}
        onCampaignChange={setSelectedCampaignId}
        campaigns={mockCampaigns}
        recommendations={mockRecommendations}
        selectedRecommendationId={selectedRecommendationId}
        onRecommendationChange={setSelectedRecommendationId}
      />

      <style jsx>{`
        .advisor-page {
          display: flex;
          height: calc(100vh - 60px);
          background: var(--bg-primary);
          overflow: hidden;
        }

        .advisor-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }
      `}</style>
    </div>
  );
}

export default function AdvisorPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading advisor...</div>
      </div>
    }>
      <AdvisorContent />
    </Suspense>
  );
}
