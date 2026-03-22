import re

with open('/home/koushik/Desktop/celo/sello/backend/app/endpoints/product/router.py', 'r') as f:
    content = f.read()

remesh_route = """
class RemeshRequest(BaseModel):
    target_polycount: int = 30000
    topology: str = "triangle"
    resize_height: float = 0.0
    origin_at: Optional[str] = None

@router.post("/remesh")
async def remesh_product(request: RemeshRequest, background_tasks: BackgroundTasks):
    state = get_product_state()
    
    if not state.trellis_output or not state.trellis_output.model_file:
        raise HTTPException(status_code=400, detail="No product model available to remesh")
        
    state.status = "processing"
    state.message = "Initializing remesh..."
    state.in_progress = True
    save_product_state(state)
    
    status_payload = ProductStatus(
        status="processing",
        progress=0,
        message="Initializing remesh...",
        model_file=state.trellis_output.model_file
    )
    save_product_status(status_payload)
    
    pipe = get_pipeline()
    background_tasks.add_task(
        pipe.run_remesh_pipeline,
        target_polycount=request.target_polycount,
        topology=request.topology,
        resize_height=request.resize_height,
        origin_at=request.origin_at
    )
    
    return {"message": "Remesh started"}
"""

if "RemeshRequest" not in content:
    content = content + "\n\n" + remesh_route
    with open('/home/koushik/Desktop/celo/sello/backend/app/endpoints/product/router.py', 'w') as f:
        f.write(content)
    print("Patched router.py")
