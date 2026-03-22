import fal_client  # type: ignore
import logging
import os
import time
from typing import Optional, List
from typing_extensions import TypedDict
from app.core.config import settings

logger = logging.getLogger(__name__)

class TrellisOutput(TypedDict, total=False):
    """Output schema from Trellis model."""
    model_file: str
    color_video: str
    gaussian_ply: str
    normal_video: str
    combined_video: str
    no_background_images: List[str]

class TrellisService:
    def __init__(self):
        self.api_key = settings.FAL_KEY
        self.model_id = settings.TRELLIS_MODEL_ID
        if self.api_key:
            # Set environment variable for fal_client library
            os.environ["FAL_KEY"] = self.api_key
            # Log first 10 chars for debugging (never log full API keys in production!)
            logger.info(f"fal.ai API key configured: {self.api_key[:10]}...")
        else:
            logger.warning("No fal.ai API key found in settings")
        logger.info(f"3D generation model configured: {self.model_id}")
    
    def generate_3d_asset(
        self,
        images: List[str],
        model_id: Optional[str] = None,
        seed: int = 1337,
        # DEMO MODE: Maximum quality settings (slower but best results)
        texture_size: int = 2048,       # Max resolution textures (was 1024)
        mesh_simplify: float = 0.95,    # 95% mesh retention for maximum detail (was 0.92)
        ss_sampling_steps: int = 20,    # High quality geometry (was 14)
        ss_guidance_strength: float = 8.0,  # Strong geometry fidelity (was 7.5)
        slat_sampling_steps: int = 20,  # High quality latent details (was 14)
        slat_guidance_strength: float = 4.0,  # Enhanced texture detail (was 3.5)
        progress_callback = None,
        use_multi_image: bool = False,
        multiimage_algo: str = "stochastic",
    ) -> TrellisOutput:
        """
        Generate a 3D asset from input images using Trellis via fal.ai.
        
        Supports single-image and multi-image workflows (set use_multi_image=True).
        
        🎨 DEMO MODE - Parameters optimized for MAXIMUM QUALITY:
        - texture_size: 2048 (max resolution for crisp textures)
        - mesh_simplify: 0.95 (95% mesh retention for maximum geometric detail)
        - ss_sampling_steps: 20 (high quality geometry reconstruction)
        - ss_guidance_strength: 8.0 (strong adherence to input image)
        - slat_sampling_steps: 20 (high quality latent space sampling)
        - slat_guidance_strength: 4.0 (enhanced texture/detail fidelity)
        
        ⏱️  Expected time: 4-6 minutes per model (vs ~2-3 min with standard settings)
        📦 Output quality: Significantly sharper textures and more detailed geometry
        """
        try:
            if not images or len(images) == 0:
                raise ValueError("No images provided")
            
            use_multi = use_multi_image and len(images) > 1
            
            logger.info("=" * 80)
            logger.info("🎨 TRELLIS SERVICE - Submitting request to fal.ai")
            logger.info(f"  Images provided: {len(images)}")
            if use_multi:
                for idx, img in enumerate(images, 1):
                    logger.info(f"    [{idx}] len={len(img)} preview={img[:100]}...")
            else:
                logger.info(f"  Image URL length: {len(images[0])}")
                logger.info(f"  Image URL preview: {images[0][:100]}...")
            logger.info(f"  seed: {seed}")
            logger.info(f"  texture_size: {texture_size}")
            logger.info(f"  mesh_simplify: {mesh_simplify}")
            logger.info(f"  ss_sampling_steps: {ss_sampling_steps}")
            logger.info(f"  ss_guidance_strength: {ss_guidance_strength}")
            logger.info(f"  slat_sampling_steps: {slat_sampling_steps}")
            logger.info(f"  slat_guidance_strength: {slat_guidance_strength}")
            logger.info("=" * 80)
            
            # Store callback for use in _handle_queue_update
            self._progress_callback = progress_callback
            
            # Track generation time
            start_time = time.time()
            
            # Submit request and get result using fal_client.subscribe
            # This handles submission, polling, and result retrieval automatically
            # Old Meshy implementation (kept commented for reference):
            # arguments = {
            #     "image_urls": images,
            #     "topology": "quad",
            #     "target_polycount": 30000,
            #     "symmetry_mode": "auto",
            #     "should_remesh": True,
            #     "should_texture": True,
            #     "enable_safety_checker": True,
            # }
            # result = fal_client.subscribe(
            #     "fal-ai/meshy/v5/multi-image-to-3d",
            #     arguments=arguments,
            #     with_logs=True,
            #     on_queue_update=lambda update: self._handle_queue_update(update)
            # )

            # Trellis implementation:
            # Some Trellis endpoints (e.g., fal-ai/trellis-2) require `image_url`
            # while Meshy-style endpoints expect `image_urls`.
            active_model_id = model_id or self.model_id
            
            logger.info(f"Using 3D max model: {active_model_id}")
            
            model_id_lc = (active_model_id or "").lower()
            if "trellis" in model_id_lc and "meshy" not in model_id_lc:
                if len(images) > 1:
                    logger.warning(
                        "Model %s expects single image input; received %d images. Using the first image.",
                        active_model_id,
                        len(images),
                    )
                arguments = {
                    "image_url": images[0],
                    "seed": seed,
                }
            elif "meshy" in model_id_lc:
                arguments = {
                    "image_urls": images,
                    "topology": "quad",
                    "target_polycount": 30000,
                    "enable_pbr": True,
                    "should_remesh": True,
                    "should_texture": True,
                    "enable_safety_checker": True,
                }
            else:
                arguments = {
                    "image_urls": images,
                    "seed": seed,
                    "texture_size": texture_size,
                    "mesh_simplify": mesh_simplify,
                    "ss_sampling_steps": ss_sampling_steps,
                    "ss_guidance_strength": ss_guidance_strength,
                    "slat_sampling_steps": slat_sampling_steps,
                    "slat_guidance_strength": slat_guidance_strength,
                }

            result = fal_client.subscribe(
                active_model_id,
                arguments=arguments,
                with_logs=True,
                on_queue_update=lambda update: self._handle_queue_update(update)
            )
            
            # Calculate generation time
            generation_time = time.time() - start_time
            
            logger.info("=" * 80)
            logger.info("✓ Request completed successfully")
            logger.info(f"⏱️  GENERATION TIME: {generation_time:.2f} seconds ({generation_time/60:.2f} minutes)")
            logger.info("=" * 80)
            logger.info(f"Result keys: {list(result.keys()) if isinstance(result, dict) else 'not a dict'}")
            
            # Log fal.ai timings if available
            if isinstance(result, dict) and "timings" in result:
                logger.info(f"📊 Fal.ai Timings: {result['timings']}")
            
            logger.info(f"Full result: {result}")
            
            # Map fal.ai output to TrellisOutput schema
            # fal.ai returns: {"model_glb": {"url": "...", ...}, ...}
            output: TrellisOutput = {}
            
            if isinstance(result, dict):
                # Check common output keys used by fal.ai 3D providers
                if "model_glb" in result and result["model_glb"]:
                    model_glb = result["model_glb"]
                    if isinstance(model_glb, dict) and "url" in model_glb:
                        output["model_file"] = model_glb["url"]
                        logger.info(f"🎯 Model file URL: {output.get('model_file')}")
                    elif isinstance(model_glb, str):
                        output["model_file"] = model_glb
                        logger.info(f"🎯 Model file URL: {output.get('model_file')}")
                elif "model_file" in result and result["model_file"]:
                    if isinstance(result["model_file"], dict) and "url" in result["model_file"]:
                        output["model_file"] = result["model_file"]["url"]
                    elif isinstance(result["model_file"], str):
                        output["model_file"] = result["model_file"]
                    logger.info(f"🎯 Model file URL: {output.get('model_file')}")
            
            if not output:
                raise Exception(f"No valid output received from fal.ai. Result was: {result}")
            
            logger.info(f"✅ Successfully generated 3D asset in {generation_time:.2f}s: {output}")
            return output
            
        except Exception as e:
            logger.exception(f"Failed to generate 3D asset: {str(e)}")
            raise Exception(f"Failed to generate 3D asset: {str(e)}")
    
    def _handle_queue_update(self, update):
        """Handle queue status updates and log progress."""
        status_msg = None
        progress_val = None
        
        if hasattr(update, 'status'):
            logger.info(f"Queue status: {update.status}")
            status_msg = update.status
            
            # Map Fal.ai statuses to progress percentages
            if update.status == 'IN_QUEUE':
                progress_val = 50
            elif update.status == 'IN_PROGRESS':
                progress_val = 70
                
        if hasattr(update, 'logs') and update.logs:
            for log in update.logs:
                if hasattr(log, 'message'):
                    logger.info(f"  Progress: {log.message}")
                    status_msg = log.message
                elif isinstance(log, dict) and 'message' in log:
                    logger.info(f"  Progress: {log['message']}")
                    status_msg = log['message']
                elif isinstance(log, str):
                    logger.info(f"  Progress: {log}")
                    status_msg = log
        
        # Call the progress callback if provided
        if self._progress_callback and status_msg:
            self._progress_callback(
                status="generating_model",
                progress=progress_val or 60,
                message=f"Trellis: {status_msg}"
            )

trellis_service = TrellisService()
