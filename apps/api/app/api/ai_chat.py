"""
AI Chat API - Endpoint for AI Advisor chat functionality.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from app.services.ai import get_ai_provider
from app.services.ai.base import AIMessage, MessageRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai", tags=["AI Chat"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = None


# System prompt for the AI Advisor
SYSTEM_PROMPT = """You are an AI Advisor for AdsMaster, a Google & Meta Ads management platform.
You help users understand their ad performance, optimize campaigns, and explain AI recommendations.

Key responsibilities:
- Explain why certain recommendations were made
- Help users understand ad metrics (CTR, CPC, ROAS, conversions, etc.)
- Provide actionable advice on improving campaign performance
- Answer questions about Google Ads and Meta Ads best practices
- Be concise but helpful

Context awareness:
- If the user is on the recommendations page, help them understand why specific recommendations were generated
- If they mention a campaign, focus on that campaign's metrics
- Always relate advice back to their actual data when possible

Keep responses concise (2-4 sentences max for simple questions, up to a paragraph for complex ones).
Use simple language, avoid jargon unless the user seems technical.
"""


@router.post("/chat", response_model=ChatResponse)
async def chat_with_advisor(request: ChatRequest):
    """
    Chat with the AI Advisor.

    The advisor can answer questions about:
    - Campaign performance and metrics
    - AI recommendations and why they were generated
    - Google/Meta Ads best practices
    - How to improve ad performance
    """
    try:
        # Get AI provider
        ai = get_ai_provider()

        # Build system prompt with context
        system_content = SYSTEM_PROMPT
        if request.context:
            context_str = f"\n\nCurrent context:\n"
            if request.context.get("page"):
                context_str += f"- User is on the {request.context['page']} page\n"
            if request.context.get("campaignId"):
                context_str += f"- Looking at campaign ID: {request.context['campaignId']}\n"
            if request.context.get("recommendationId"):
                context_str += f"- Discussing recommendation ID: {request.context['recommendationId']}\n"
            system_content += context_str

        # Build conversation history with AIMessage objects
        messages: List[AIMessage] = [
            AIMessage(role=MessageRole.SYSTEM, content=system_content)
        ]

        # Add history
        if request.history:
            for msg in request.history[-10:]:  # Last 10 messages
                role = MessageRole.USER if msg.role == "user" else MessageRole.ASSISTANT
                messages.append(AIMessage(role=role, content=msg.content))

        # Add current message
        messages.append(AIMessage(role=MessageRole.USER, content=request.message))

        # Generate response
        ai_response = await ai.chat(
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )

        # Generate follow-up suggestions based on the response
        suggestions = _generate_suggestions(request.message, ai_response.content)

        return ChatResponse(
            response=ai_response.content,
            suggestions=suggestions
        )

    except Exception as e:
        logger.error(f"AI Chat error: {e}")
        # Fallback response
        return ChatResponse(
            response=_get_fallback_response(request.message),
            suggestions=["Tell me more about my campaigns", "How can I improve ROAS?"]
        )


def _generate_suggestions(question: str, response: str) -> List[str]:
    """Generate contextual follow-up suggestions."""
    question_lower = question.lower()

    if "ctr" in question_lower or "click" in question_lower:
        return [
            "How do I improve ad copy?",
            "What's a good CTR benchmark?",
        ]
    elif "roas" in question_lower or "return" in question_lower:
        return [
            "How do I increase conversions?",
            "Should I adjust my budget?",
        ]
    elif "recommendation" in question_lower:
        return [
            "Why was this recommended?",
            "What happens if I apply it?",
        ]
    elif "budget" in question_lower:
        return [
            "How do I calculate optimal budget?",
            "When should I increase budget?",
        ]
    else:
        return [
            "Explain this in simpler terms",
            "What should I do next?",
        ]


def _get_fallback_response(question: str) -> str:
    """Provide a helpful fallback response when AI is unavailable."""
    question_lower = question.lower()

    if "ctr" in question_lower:
        return "CTR (Click-Through Rate) measures how often people click your ad after seeing it. A low CTR usually means your ad isn't relevant to your audience or your ad copy needs improvement. Try making your headlines more specific and include a clear call-to-action."

    elif "roas" in question_lower:
        return "ROAS (Return on Ad Spend) shows how much revenue you earn for every dollar spent on ads. A ROAS of 3.0 means you earn $3 for every $1 spent. To improve ROAS, focus on reducing wasted spend on non-converting keywords and increasing bids on your best performers."

    elif "recommendation" in question_lower:
        return "AI recommendations are generated by analyzing your campaign data. Each recommendation includes the reasoning behind it - click 'Why this recommendation?' to see the specific metrics and triggers. You can apply, dismiss, or ask me more about any recommendation."

    elif "budget" in question_lower:
        return "Your budget determines how much you can spend daily. If a campaign is profitable (ROAS > your target) but running out of budget, increasing the budget can capture more conversions. Check if your campaigns show 'Limited by budget' status."

    elif "quality score" in question_lower or "qs" in question_lower:
        return "Quality Score (1-10) affects your ad rank and CPC. Higher scores mean lower costs and better positions. Improve it by: 1) Making keywords match your ad text, 2) Ensuring landing page relevance, 3) Improving CTR with better ad copy."

    else:
        return "I'm here to help you optimize your ad campaigns. You can ask me about metrics like CTR, ROAS, conversions, or about specific AI recommendations. What would you like to know?"
