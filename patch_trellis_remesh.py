import re

with open('/home/koushik/Desktop/celo/sello/backend/app/integrations/trellis.py', 'r') as f:
    content = f.read()

remesh_code = """
    def remesh_3d_asset(
        self,
        model_url: str,
        target_formats: List[str] = ["glb", "fbx"],
        topology: str = "triangle",
        target_polycount: int = 30000,
        resize_height: float = 0.0,
        origin_at: Optional[str] = None
    ) -> TrellisOutput:
        \"\"\"Remeshes an existing 3D model using Meshy-5 on fal.ai\"\"\"
        if not self.api_key:
            raise Exception("FAL_KEY environment variable is not set")
            
        remesh_model_id = "fal-ai/meshy/v5/remesh"
        logger.info(f"Starting 3D remesh with model: {remesh_model_id}")
        logger.info(f"Target polycount: {target_polycount}, Topology: {topology}")
        logger.info(f"Model URL: {model_url}")
        
        args = {
            "model_url": model_url,
            "target_formats": target_formats,
            "topology": topology,
            "target_polycount": target_polycount,
        }
        
        if resize_height > 0:
            args["resize_height"] = resize_height
        if origin_at in ["bottom", "center"]:
            args["origin_at"] = origin_at
            
        try:
            start_time = time.time()
            
            # Submit async request
            handler = fal_client.submit(
                remesh_model_id,
                arguments=args
            )
            
            logger.info(f"Request submitted. ID: {handler.request_id}")
            
            # Poll for status
            result = None
            last_status = None
            
            while True:
                status = fal_client.status(remesh_model_id, handler.request_id, with_logs=True)
                
                if hasattr(status, 'status'):
                    current_status = status.status
                    if current_status != last_status:
                        logger.info(f"Queue status: {current_status}")
                        last_status = current_status
                        
                if hasattr(status, 'logs') and status.logs:
                    for log_entry in status.logs:
                        if isinstance(log_entry, dict) and "message" in log_entry:
                            logger.info(f"fal.ai log: {log_entry['message']}")
                            
                if fal_client.is_done(status):
                    result = fal_client.result(remesh_model_id, handler.request_id)
                    break
                    
                time.sleep(2.0)
                
            generation_time = time.time() - start_time
            logger.info(f"✓ Remesh completed in {generation_time:.2f}s")
            
            output: TrellisOutput = {}
            if isinstance(result, dict):
                # Try handling `model_glb`
                if "model_glb" in result and result["model_glb"]:
                    m = result["model_glb"]
                    if isinstance(m, dict) and "url" in m:
                        output["model_file"] = m["url"]
                    elif isinstance(m, str):
                        output["model_file"] = m
                elif "model_urls" in result and result["model_urls"]:
                    if "glb" in result["model_urls"] and "url" in result["model_urls"]["glb"]:
                        output["model_file"] = result["model_urls"]["glb"]["url"]
            
            if not output.get("model_file"):
                raise Exception(f"No valid output received from remesh. Result was: {result}")
                
            return output
            
        except Exception as e:
            logger.exception(f"Failed to remesh 3D asset: {str(e)}")
            raise Exception(f"Failed to remesh 3D asset: {str(e)}")
"""

class_start = content.find("class TrellisService:")
def_handle = content.find("def _handle_queue_update")
patched_content = content[:def_handle] + remesh_code + "\n    " + content[def_handle:]

with open('/home/koushik/Desktop/celo/sello/backend/app/integrations/trellis.py', 'w') as f:
    f.write(patched_content)

print("Patched trellis.py")
