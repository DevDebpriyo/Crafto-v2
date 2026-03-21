from fastapi import FastAPI
from app.endpoints.trellis.router import router as trellis_router
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(title="Trellis 3D Generation API")

# Include routers
app.include_router(trellis_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Trellis 3D Generation API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
