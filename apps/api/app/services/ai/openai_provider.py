"""
OpenAI ChatGPT AI Provider.

Uses openai SDK for GPT-4o and other models.
"""

from typing import List, Dict, Any, Optional, AsyncGenerator
import os

from .base import AIProvider, AIMessage, AIResponse, MessageRole


class OpenAIProvider(AIProvider):
    """
    OpenAI ChatGPT Provider.

    Models:
    - gpt-4o: Most capable, multimodal
    - gpt-4o-mini: Fast and cost-effective
    - gpt-4-turbo: Previous generation
    - gpt-3.5-turbo: Legacy, cheapest
    """

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def default_model(self) -> str:
        return "gpt-4o-mini"

    @property
    def available_models(self) -> List[str]:
        return [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-4",
            "gpt-3.5-turbo",
            "o1-preview",
            "o1-mini",
        ]

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model or self.default_model
        self._client = None

    def _get_client(self):
        """Lazy load the OpenAI client."""
        if self._client is None:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=self.api_key)
            except ImportError:
                raise ImportError(
                    "openai package not installed. "
                    "Run: pip install openai"
                )
        return self._client

    def _convert_messages(self, messages: List[AIMessage]) -> List[Dict[str, str]]:
        """Convert our message format to OpenAI format."""
        return [
            {"role": msg.role.value, "content": msg.content}
            for msg in messages
        ]

    async def chat(
        self,
        messages: List[AIMessage],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs
    ) -> AIResponse:
        """Send a chat completion request to OpenAI."""

        if not self.api_key:
            return AIResponse(
                content="[Demo Mode] OpenAI API key not configured. This is a placeholder response.",
                model=self.model,
                provider=self.provider_name,
                usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                finish_reason="demo"
            )

        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self.api_key)
            openai_messages = self._convert_messages(messages)

            response = await client.chat.completions.create(
                model=self.model,
                messages=openai_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )

            choice = response.choices[0]

            return AIResponse(
                content=choice.message.content or "",
                model=response.model,
                provider=self.provider_name,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "total_tokens": response.usage.total_tokens if response.usage else 0,
                },
                finish_reason=choice.finish_reason or "stop",
                raw_response=response
            )

        except ImportError:
            return AIResponse(
                content="[Error] openai package not installed.",
                model=self.model,
                provider=self.provider_name,
                usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                finish_reason="error"
            )
        except Exception as e:
            return AIResponse(
                content=f"[Error] OpenAI API error: {str(e)}",
                model=self.model,
                provider=self.provider_name,
                usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                finish_reason="error"
            )

    async def stream_chat(
        self,
        messages: List[AIMessage],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream a chat completion response from OpenAI."""

        if not self.api_key:
            yield "[Demo Mode] OpenAI streaming not available without API key."
            return

        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self.api_key)
            openai_messages = self._convert_messages(messages)

            stream = await client.chat.completions.create(
                model=self.model,
                messages=openai_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                **kwargs
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            yield f"[Error] OpenAI streaming error: {str(e)}"
