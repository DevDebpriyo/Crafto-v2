from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
from app.integrations.gemini import gemini_image_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/images", tags=["images"])

class ImageEditRequest(BaseModel):
    original_image: str  # Base64 encoded
    mask_image: str     # Base64 encoded
    prompt: str

@router.post("/edit")
async def edit_image(request: ImageEditRequest):
    """
    Edit an image using Gemini based on a mask and prompt.
    
    - **original_image**: Base64 encoded original image.
    - **mask_image**: Base64 encoded mask (white = edit area).
    - **prompt**: Description of the edit to perform.
    """
    try:
        result = await gemini_image_service.edit_image(
            original_image_b64=request.original_image,
            mask_image_b64=request.mask_image,
            prompt=request.prompt
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to generate edited image")
            
        return {"edited_image": result}
    except Exception as e:
        logger.error(f"Image editing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

