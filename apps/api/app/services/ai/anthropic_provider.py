"""
Anthropic Claude AI Provider.

Uses anthropic SDK for Claude 3 and Claude 4 models.
"""

from typing import List, Dict, Any, Optional, AsyncGenerator
import os

from .base import AIProvider, AIMessage, AIResponse, MessageRole


class AnthropicProvider(AIProvider):
    """
    Anthropic Claude Provider.

    Models:
    - claude-sonnet-4-20250514: Best balance of intelligence and speed
    - claude-opus-4-20250514: Most capable for complex tasks
    - claude-3-5-sonnet-20241022: Previous generation
    - claude-3-haiku-20240307: Fast and cost-effective
    """

    @property
    def provider_name(self) -> str:
        return "anthropic"

    @property
    def default_model(self) -> str:
        return "claude-sonnet-4-20250514"

    @property
    def available_models(self) -> List[str]:
        return [
            "claude-sonnet-4-20250514",
            "claude-opus-4-20250514",
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
        ]

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.model = model or self.default_model
        self._client = None

    def _get_client(self):
        """Lazy load the Anthropic client."""
        if self._client is None:
            try:
                from anthropic import AsyncAnthropic
                self._client = AsyncAnthropic(api_key=self.api_key)
            except ImportError:
                raise ImportError(
                    "anthropic package not installed. "
                    "Run: pip install anthropic"
                )
        return self._client

    def _convert_messages(self, messages: List[AIMessage]) -> tuple:
        """
        Convert our message format to Anthropic format.

        Returns (messages_list, system_prompt)
        """
        anthropic_messages = []
        system_prompt = None

        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                system_prompt = msg.content
            elif msg.role == MessageRole.USER:
                anthropic_messages.append({"role": "user", "content": msg.content})
            elif msg.role == MessageRole.ASSISTANT:
                anthropic_messages.append({"role": "assistant", "content": msg.content})

        return anthropic_messages, system_prompt

    async def chat(
        self,
        messages: List[AIMessage],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs
    ) -> AIResponse:
        """Send a chat completion request to Claude."""

        if not self.api_key:
            return AIResponse(
                content="[Demo Mode] Anthropic API key not configured. This is a placeholder response.",
                model=self.model,
                provider=self.provider_name,
                usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                finish_reason="demo"
            )

        try:
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=self.api_key)
            anthropic_messages, system_prompt = self._convert_messages(messages)

            # Build request params
            params = {
                "model": self.model,
                "messages": anthropic_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if system_prompt:
                params["system"] = system_prompt

            response = await client.messages.create(**params)

            return AIResponse(
                content=response.content[0].text if response.content else "",
                model=response.model,
                provider=self.provider_name,
                usage={
                    "prompt_tokens": response.usage.input_tokens if response.usage else 0,
                    "completion_tokens": response.usage.output_tokens if response.usage else 0,
                    "total_tokens": (response.usage.input_tokens + response.usage.output_tokens) if response.usage else 0,
                },
                finish_reason=response.stop_reason or "stop",
                raw_response=response
            )

        except ImportError:
            return AIResponse(
                content="[Error] anthropic package not installed.",
                model=self.model,
                provider=self.provider_name,
                usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                finish_reason="error"
            )
        except Exception as e:
            return AIResponse(
                content=f"[Error] Anthropic API error: {str(e)}",
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
        """Stream a chat completion response from Claude."""

        if not self.api_key:
            yield "[Demo Mode] Anthropic streaming not available without API key."
            return

        try:
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=self.api_key)
            anthropic_messages, system_prompt = self._convert_messages(messages)

            params = {
                "model": self.model,
                "messages": anthropic_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if system_prompt:
                params["system"] = system_prompt

            async with client.messages.stream(**params) as stream:
                async for text in stream.text_stream:
                    yield text

        except Exception as e:
            yield f"[Error] Anthropic streaming error: {str(e)}"
