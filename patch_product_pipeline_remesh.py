import re

with open('/home/koushik/Desktop/celo/sello/backend/app/services/product_pipeline.py', 'r') as f:
    content = f.read()

remesh_pipeline_code = """
    def run_remesh_pipeline(self, target_polycount: int, topology: str, resize_height: float, origin_at: Optional[str] = None) -> None:
        \"\"\"Background task for remeshing an existing model.\"\"\"
        try:
            logger.info("[product-pipeline] Starting remesh pipeline")
            
            # Fetch current state
            state = get_product_state()
            if not state.trellis_output or not state.trellis_output.model_file:
                logger.error("[product-pipeline] No model file to remesh.")
                self.fail_pipeline("No model available to remesh.")
                return

            original_model_url = state.trellis_output.model_file
            
            self._update_status(
                ProductStatus(
                    status="processing",
                    progress=10,
                    message="Submitting remesh request to Meshy...",
                    model_file=original_model_url
                )
            )

            # Call remesh API
            from app.integrations.trellis import trellis_service
            
            output = trellis_service.remesh_3d_asset(
                model_url=original_model_url,
                target_polycount=target_polycount,
                topology=topology,
                resize_height=resize_height,
                origin_at=origin_at
            )
            
            # Update state with new model
            state = get_product_state() # fresh fetch
            
            # Create a new iteration for the remesh
            from app.models.product_state import ProductIteration, TrellisArtifacts
            import uuid
            
            new_artifacts = TrellisArtifacts()
            if state.trellis_output:
                new_artifacts.no_background_images = list(state.trellis_output.no_background_images)
            new_artifacts.model_file = output.get("model_file")
            
            new_iteration = ProductIteration(
                id=str(uuid.uuid4()),
                type="edit",
                prompt="Remeshed model",
                note=f"Target Poly: {target_polycount}, Topology: {topology}",
                trellis_output=new_artifacts
            )
            
            state.iterations.append(new_iteration)
            state.trellis_output = new_artifacts
            state.status = "complete"
            state.message = "Remesh complete"
            state.in_progress = False
            state.updated_at = _utcnow()
            
            save_product_state(state)
            
            self._update_status(
                ProductStatus(
                    status="complete",
                    progress=100,
                    message="Model remeshed successfully",
                    model_file=new_artifacts.model_file,
                )
            )
            
            logger.info("[product-pipeline] Remesh pipeline complete")
            
        except Exception as exc:
            logger.exception("[product-pipeline] Exception in remesh: %s", exc)
            self.fail_pipeline(f"Failed to remesh: {str(exc)}")

"""

class_match = re.search(r'class ProductPipeline(.*?)(?:def |$)', content, re.MULTILINE)
if class_match:
    insert_pos = content.find("def fail_pipeline")
    patched = content[:insert_pos] + remesh_pipeline_code + content[insert_pos:]
    with open('/home/koushik/Desktop/celo/sello/backend/app/services/product_pipeline.py', 'w') as f:
        f.write(patched)
    print("Patched product_pipeline.py")
else:
    print("Could not find insertion point!")
