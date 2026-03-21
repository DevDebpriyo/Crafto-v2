from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    REPLICATE_API_KEY: Optional[str] = None
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    PRODUCT_STATE_TTL_SECONDS: int = 24 * 60 * 60
    
    # Gemini
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-pro-002"
    GEMINI_FLASH_MODEL: str = "gemini-2.0-flash-exp" # Updated to latest available or stick to 1.5-flash
    GEMINI_TEMPERATURE: float = 0.7
    GEMINI_MAX_TOKENS: int = 2048
    GEMINI_MAX_RETRIES: int = 3
    GEMINI_PRODUCT_IMAGE_API_URL: Optional[str] = None
    GEMINI_PRODUCT_IMAGE_API_KEY: Optional[str] = None
    GEMINI_PRODUCT_IMAGE_TIMEOUT: int = 45
    GEMINI_PRODUCT_IMAGE_COUNT: int = 3

    class Config:
        env_file = ".env"
        extra = "ignore"  # Allow extra fields in .env

settings = Settings()
