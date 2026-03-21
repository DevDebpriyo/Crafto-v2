import json
import time
import asyncio
import logging
import traceback
import base64
import os
from typing import Dict, Any, List, Optional, Union
from contextlib import asynccontextmanager

import google.generativeai as genai
from google.genai import types
from google.genai import Client as GenaiClient
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from app.core.config import settings
from app.core.redis import redis_service

logger = logging.getLogger(__name__)

class GeminiError(Exception):
    """Gemini service errors."""
    pass

class QuotaExceededError(GeminiError):
    """API quota exceeded."""
    pass

class SafetyError(GeminiError):
    """Content blocked by safety filters."""
    pass

class GeminiChatService:
    """Service for text-based chat and data extraction using Gemini."""
    
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not found in settings")
            self.configured = False
        else:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.configured = True
        
        self.pro_model = settings.GEMINI_MODEL
        self.flash_model = settings.GEMINI_FLASH_MODEL
        self.current_model = self.flash_model
        
        # No safety settings - disabled for unrestricted operation
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }
        
        self.request_count = 0
        self.error_count = 0

    def _get_generation_config(self, task_type: str = "default") -> Dict[str, Any]:
        """Get generation config optimized for task type."""
        base_config = {
            "temperature": settings.GEMINI_TEMPERATURE,
            "max_output_tokens": settings.GEMINI_MAX_TOKENS,
        }

        if task_type == "extraction":
            base_config.update({"temperature": 0.1, "max_output_tokens": 4096})
        elif task_type == "creative":
            base_config.update({"temperature": 0.8, "max_output_tokens": 8192})
        elif task_type == "analysis":
            base_config.update({"temperature": 0.3, "max_output_tokens": 6144})

        return base_config

    async def generate_content(
        self,
        prompt: str,
        task_type: str = "default",
        response_schema: Optional[Dict[str, Any]] = None,
        max_retries: int = None
    ) -> Dict[str, Any]:
        """
        Generate content with retries and monitoring.
        """
        if not self.configured:
            raise GeminiError("Gemini API key not configured")
            
        max_retries = max_retries or settings.GEMINI_MAX_RETRIES
        
        # Use Flash model primarily for speed/cost
        model_name = self.flash_model
        
        generation_config = self._get_generation_config(task_type)
        
        if response_schema:
            generation_config.update({
                "response_mime_type": "application/json",
                "response_schema": response_schema
            })
            
        for attempt in range(max_retries):
            try:
                self.request_count += 1
                model = genai.GenerativeModel(
                    model_name=model_name,
                    generation_config=generation_config,
                    safety_settings=self.safety_settings,
                )
                
                response = await model.generate_content_async(prompt)
                
                if response.text:
                    if response_schema:
                        try:
                            return json.loads(response.text)
                        except json.JSONDecodeError:
                            logger.warning(f"JSON parse error on attempt {attempt + 1}")
                            # Try to clean up markdown if present
                            cleaned_text = response.text.strip()
                            if cleaned_text.startswith("```"):
                                lines = cleaned_text.split("\n")
                                cleaned_text = "\n".join(lines[1:-1]) if len(lines) > 2 else cleaned_text
                            try:
                                return json.loads(cleaned_text)
                            except:
                                pass
                    else:
                        return {"text": response.text}
            
            except Exception as e:
                self.error_count += 1
                logger.warning(f"Gemini attempt {attempt + 1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    raise GeminiError(f"Max retries exceeded: {str(e)}")
                await asyncio.sleep(2 ** attempt)
                
        return {"error": "Failed to generate content"}


class GeminiImageService:
    """Service for image editing and analysis using Gemini."""
    
    def __init__(self):
        if settings.GEMINI_API_KEY:
            self.client = GenaiClient(api_key=settings.GEMINI_API_KEY)
        else:
            self.client = None
            logger.warning("Gemini API key not found for Image Service")

    async def edit_image(
        self,
        original_image_b64: str,
        mask_image_b64: str,
        prompt: str
    ) -> Optional[str]:
        """
        Edit an image using Gemini's image editing capabilities.
        
        Args:
            original_image_b64: Base64 of the original image
            mask_image_b64: Base64 of the mask (white=edit, black=preserve)
            prompt: Text description of the desired edit
        """
        try:
            if not self.client:
                raise Exception("Gemini client not initialized")
            
            # Decode base64
            original_bytes = base64.b64decode(original_image_b64)
            mask_bytes = base64.b64decode(mask_image_b64)
            
            # Construct prompt
            full_prompt = f"""Edit this image based on the mask and prompt.
            
            TASK: {prompt}
            
            Generate the edited image with changes ONLY in white mask areas.
            """
            
            # Call Gemini API (using the genai.Client for image editing specifically if needed, 
            # or the standard generativeai package if it supports it. 
            # The HTV code used genai.Client with 'gemini-2.5-flash-image' or similar)
            
            response = self.client.models.generate_content(
                model="gemini-2.0-flash-exp", # Using 2.0 Flash which handles multimodal better
                contents=[
                    full_prompt,
                    types.Part.from_bytes(data=original_bytes, mime_type="image/png"),
                    types.Part.from_bytes(data=mask_bytes, mime_type="image/png")
                ]
            )
            
            # Extract image
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'inline_data') and part.inline_data:
                            image_b64 = base64.b64encode(part.inline_data.data).decode()
                            return f"data:image/png;base64,{image_b64}"
            
            return None
            
        except Exception as e:
            logger.error(f"Error calling Gemini Image Service: {str(e)}")
            logger.error(traceback.format_exc())
            return None

# Initialize services
gemini_chat_service = GeminiChatService()
gemini_image_service = GeminiImageService()

