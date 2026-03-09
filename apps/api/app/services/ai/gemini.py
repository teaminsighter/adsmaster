"""
Google Gemini AI Provider.

Uses google-generativeai SDK for Gemini 2.5 models.
"""

from typing import List, Dict, Any, Optional, AsyncGenerator
import os

from .base import AIProvider, AIMessage, AIResponse, MessageRole


class GeminiProvider(AIProvider):
    """
    Google Gemini AI Provider.

    Models:
    - gemini-2.5-flash: Fast, cost-effective (recommended for most tasks)
    - gemini-2.5-pro: Most capable, for complex reasoning
    """

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def default_model(self) -> str:
        return "gemini-2.5-flash"

    @property
    def available_models(self) -> List[str]:
        return [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
        ]

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model = model or self.default_model
        self._client = None

    def _get_client(self):
        """Lazy load the Gemini client."""
        if self._client is None:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self._client = genai.GenerativeModel(self.model)
            except ImportError:
                raise ImportError(
                    "google-generativeai package not installed. "
                    "Run: pip install google-generativeai"
                )
        return self._client

    def _convert_messages(self, messages: List[AIMessage]) -> List[Dict[str, Any]]:
        """Convert our message format to Gemini format."""
        gemini_messages = []
        system_instruction = None

        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                system_instruction = msg.content
            elif msg.role == MessageRole.USER:
                gemini_messages.append({"role": "user", "parts": [msg.content]})
            elif msg.role == MessageRole.ASSISTANT:
                gemini_messages.append({"role": "model", "parts": [msg.content]})

        return gemini_messages, system_instruction

    async def chat(
        self,
        messages: List[AIMessage],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs
    ) -> AIResponse:
        """Send a chat completion request to Gemini."""

        if not self.api_key:
            # Return mock response for demo mode
            return AIResponse(
                content="[Demo Mode] Gemini API key not configured. This is a placeholder response.",
                model=self.model,
                provider=self.provider_name,
                usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                finish_reason="demo"
            )

        try:
            import google.generativeai as genai

            genai.configure(api_key=self.api_key)

            gemini_messages, system_instruction = self._convert_messages(messages)

            # Create model with system instruction if present
            model_config = {"temperature": temperature, "max_output_tokens": max_tokens}
            if system_instruction:
                model = genai.GenerativeModel(
                    self.model,
                    system_instruction=system_instruction,
                    generation_config=model_config
                )
            else:
                model = genai.GenerativeModel(self.model, generation_config=model_config)

            # Start chat and send messages
            chat = model.start_chat(history=gemini_messages[:-1] if len(gemini_messages) > 1 else [])
            response = await chat.send_message_async(gemini_messages[-1]["parts"][0] if gemini_messages else "Hello")

            return AIResponse(
                content=response.text,
                model=self.model,
                provider=self.provider_name,
                usage={
                    "prompt_tokens": response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0,
                    "completion_tokens": response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0,
                    "total_tokens": response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0,
                },
                finish_reason="stop",
                raw_response=response
            )

        except ImportError:
            return AIResponse(
                content="[Error] google-generativeai package not installed.",
                model=self.model,
                provider=self.provider_name,
                usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                finish_reason="error"
            )
        except Exception as e:
            return AIResponse(
                content=f"[Error] Gemini API error: {str(e)}",
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
        """Stream a chat completion response from Gemini."""

        if not self.api_key:
            yield "[Demo Mode] Gemini streaming not available without API key."
            return

        try:
            import google.generativeai as genai

            genai.configure(api_key=self.api_key)

            gemini_messages, system_instruction = self._convert_messages(messages)

            model_config = {"temperature": temperature, "max_output_tokens": max_tokens}
            if system_instruction:
                model = genai.GenerativeModel(
                    self.model,
                    system_instruction=system_instruction,
                    generation_config=model_config
                )
            else:
                model = genai.GenerativeModel(self.model, generation_config=model_config)

            chat = model.start_chat(history=gemini_messages[:-1] if len(gemini_messages) > 1 else [])
            response = await chat.send_message_async(
                gemini_messages[-1]["parts"][0] if gemini_messages else "Hello",
                stream=True
            )

            async for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            yield f"[Error] Gemini streaming error: {str(e)}"
