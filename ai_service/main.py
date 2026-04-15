import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

model_loaded = False


MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))


class PredictAllRequest(BaseModel):
    city: str = Field(..., examples=["Mumbai"])
    rainfall: float = Field(..., ge=0, le=200, examples=[110])
    temperature: float = Field(..., ge=-10, le=60, examples=[38])
    aqi: float = Field(..., ge=0, le=500, examples=[240])
    delivery_drop: float = Field(..., ge=0, le=1, examples=[0.55])
    expected_income: float = Field(..., ge=0, examples=[5000])


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Server starting up...")
    # CRITICAL: Use only pre-trained models from /models (no training).
    import sys
    parent_dir = os.path.dirname(MODELS_DIR)  # Get parent of models dir (project root)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    from models.predict import load_models  # type: ignore

    try:
        load_models(MODELS_DIR)
        global model_loaded
        model_loaded = True
        log.info("All models loaded successfully")
    except Exception as e:
        log.error(f"Failed to load models: {e}")
        model_loaded = False
    yield
    log.info("Server shutting down")


app = FastAPI(title="DisasterShield AI Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    log.info(f"Health check - models loaded: {model_loaded}")
    return "ok"


@app.get("/warmup")
def warmup():
    if not model_loaded:
        log.warning("Warmup called but models not loaded")
        raise HTTPException(status_code=503, detail="Models not ready")
    
    log.info("Warmup endpoint hit - running dummy prediction")
    try:
        from models.predict import predict_all_api  # type: ignore
        
        # Dummy inputs matching Pydantic schema
        dummy_result = predict_all_api(
            city="Mumbai",
            rainfall=110.0,
            temperature=38.0,
            aqi=240.0,
            delivery_drop=0.55,
            expected_inc=5000.0,
        )
        log.info("Warmup prediction successful")
        return {"status": "warmed"}
    except Exception as e:
        log.error(f"Warmup failed: {e}")
        raise HTTPException(status_code=500, detail="Warmup failed")


@app.post("/predict-all")
def predict_all(body: PredictAllRequest):
    log.info(f"Predict request: city={body.city}, rainfall={body.rainfall}")
    
    if not model_loaded:
        log.error("Predict called but models not loaded")
        raise HTTPException(status_code=503, detail="Models not ready")
    
    try:
        from models.predict import predict_all_api  # type: ignore

        result = predict_all_api(
            city=body.city,
            rainfall=float(body.rainfall),
            temperature=float(body.temperature),
            aqi=float(body.aqi),
            delivery_drop=float(body.delivery_drop),
            expected_inc=float(body.expected_income),
        )

        log.info("Prediction successful")
        # Return schema required by prompt (plus a few helpful fields are okay)
        return {
            "risk_level": result.get("risk_level"),
            "risk_prob_high": result.get("risk_prob_high"),
            "predicted_loss": result.get("predicted_loss"),
            "payout_amount": result.get("payout_amount"),
            "triggered": result.get("triggered"),
            "trigger_score": result.get("trigger_score"),
            "trigger_reasons": result.get("trigger_reasons"),
            "fraud_score": result.get("fraud_score"),
            "fraud_flagged": result.get("fraud_flagged"),
            # extra (useful for demo)
            "trigger_status": result.get("trigger_status"),
            "claim_approved": result.get("claim_approved"),
            "approval_reasons": result.get("approval_reasons"),
            "city_supported": result.get("city_supported"),
        }
    except Exception as e:
        log.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/")
def home():
    return {
        "message": "DisasterShield API is running 🚀",
        "docs": "/docs",
        "health": "/health",
        "predict": "/predict-all"
    }