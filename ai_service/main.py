import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


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
    # CRITICAL: Use only pre-trained models from /models (no training).
    from models.predict import load_models  # type: ignore

    load_models(MODELS_DIR)
    yield


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
    return {"ok": True}


@app.post("/predict-all")
def predict_all(body: PredictAllRequest):
    from models.predict import predict_all_api  # type: ignore

    result = predict_all_api(
        city=body.city,
        rainfall=float(body.rainfall),
        temperature=float(body.temperature),
        aqi=float(body.aqi),
        delivery_drop=float(body.delivery_drop),
        expected_inc=float(body.expected_income),
    )

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

