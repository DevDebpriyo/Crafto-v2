from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.integrations.trellis import trellis_service, TrellisOutput
import logging
import traceback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trellis", tags=["trellis"])

class Generate3DRequest(BaseModel):
    images: List[str]
    seed: int = 1337
    randomize_seed: bool = False
    texture_size: int = 2048
    mesh_simplify: float = 0.96
    generate_color: bool = True
    generate_normal: bool = False
    generate_model: bool = True
    save_gaussian_ply: bool = False
    return_no_background: bool = True
    ss_sampling_steps: int = 26
    ss_guidance_strength: float = 8.0
    slat_sampling_steps: int = 26
    slat_guidance_strength: float = 3.2

@router.post("/generate", response_model=TrellisOutput)
async def generate_3d_asset(request: Generate3DRequest):
    """
    Generate a 3D asset from input images using Trellis.
    
    Returns various outputs based on the generation flags:
    - model_file: GLB 3D model (if generate_model=True)
    - color_video: Color render video (if generate_color=True)
    - gaussian_ply: Gaussian point cloud (if save_gaussian_ply=True)
    - normal_video: Normal render video (if generate_normal=True)
    - combined_video: Combined video
    - no_background_images: Preprocessed images (if return_no_background=True)
    """
    try:
        logger.info("=" * 80)
        logger.info("TRELLIS REQUEST PARAMETERS:")
        logger.info(f"  images: {request.images}")
        logger.info("=" * 80)
        
        output = trellis_service.generate_3d_asset(
            images=request.images,
            seed=request.seed,
            randomize_seed=request.randomize_seed,
            texture_size=request.texture_size,
            mesh_simplify=request.mesh_simplify,
            generate_color=request.generate_color,
            generate_normal=request.generate_normal,
            generate_model=request.generate_model,
            save_gaussian_ply=request.save_gaussian_ply,
            return_no_background=request.return_no_background,
            ss_sampling_steps=request.ss_sampling_steps,
            ss_guidance_strength=request.ss_guidance_strength,
            slat_sampling_steps=request.slat_sampling_steps,
            slat_guidance_strength=request.slat_guidance_strength
        )
        logger.info("Successfully generated 3D asset")
        return output
    except Exception as e:
        logger.error(f"Error generating 3D asset: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to generate 3D asset: {str(e)}")

