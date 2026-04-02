import os
import pickle
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")


# Loaded artifacts (set by load_models)
risk_model = None
income_model = None
fraud_model = None
isolation_model = None
le = None
fraud_scaler = None
anomaly_scaler = None


def load_models(folder_path: str):
    """
    Load all model/scaler/encoder artifacts from `folder_path` (the `models/` dir).
    """
    global risk_model, income_model, fraud_model, isolation_model
    global le, fraud_scaler, anomaly_scaler

    with open(os.path.join(folder_path, "risk_model.pkl"), "rb") as f:
        risk_model = pickle.load(f)
    with open(os.path.join(folder_path, "income_loss_model.pkl"), "rb") as f:
        income_model = pickle.load(f)
    with open(os.path.join(folder_path, "fraud_model.pkl"), "rb") as f:
        fraud_model = pickle.load(f)
    with open(os.path.join(folder_path, "isolation_forest.pkl"), "rb") as f:
        isolation_model = pickle.load(f)

    with open(os.path.join(folder_path, "city_label_encoder.pkl"), "rb") as f:
        le = pickle.load(f)
    with open(os.path.join(folder_path, "fraud_scaler.pkl"), "rb") as f:
        fraud_scaler = pickle.load(f)
    with open(os.path.join(folder_path, "anomaly_scaler.pkl"), "rb") as f:
        anomaly_scaler = pickle.load(f)

    return True


def _pad_or_trim(features, required_len: int):
    feats = list(features)
    if len(feats) < required_len:
        feats += [0.0] * (required_len - len(feats))
    return feats[:required_len]


def _weather_severity(rainfall_mm: float, temperature_c: float, aqi: float) -> float:
    # Composite per your documentation
    return (
        (rainfall_mm / 150.0) * 0.40
        + (aqi / 300.0) * 0.35
        + ((temperature_c - 25.0) / 20.0) * 0.25
    )


def predict_all_api(
    city: str,
    rainfall: float,
    temperature: float,
    aqi: float,
    delivery_drop: float,
    expected_inc: float,
):
    """
    Runs Models 1–4 (and computes payout), returning a backend-friendly dict.
    """
    if any(x is None for x in [risk_model, income_model, fraud_model, isolation_model, le, fraud_scaler, anomaly_scaler]):
        raise RuntimeError("Models not loaded. Call load_models(models_dir) first.")

    # -----------------------
    # Model 1 — Risk Scoring
    # -----------------------
    weather_severity = _weather_severity(rainfall, temperature, aqi)
    city_supported = True
    try:
        city_encoded = int(le.transform([city])[0])
    except Exception:
        # Fallback: keep pipeline running even if encoder wasn't trained on this city.
        # (You can still use the trigger/fraud logic; model outputs may be less accurate.)
        city_supported = False
        city_encoded = 0

    risk_input = pd.DataFrame(
        [
            {
                "rainfall_mm": rainfall,
                "temperature_c": temperature,
                "aqi": aqi,
                "delivery_drop_ratio": delivery_drop,
                "weather_severity": weather_severity,
                "city_encoded": city_encoded,
            }
        ]
    )
    risk_pred = int(risk_model.predict(risk_input)[0])
    risk_proba = risk_model.predict_proba(risk_input)[0]
    risk_map = {0: "Low", 1: "Medium", 2: "High"}

    # -----------------------------
    # Model 2 — Income Loss (₹)
    # -----------------------------
    actual_income = expected_inc * (1.0 - delivery_drop)
    expected_vs_actual = (actual_income / expected_inc) if expected_inc else 0.0

    income_input = pd.DataFrame(
        [
            {
                "rainfall_mm": rainfall,
                "temperature_c": temperature,
                "aqi": aqi,
                "delivery_drop_ratio": delivery_drop,
                "weather_severity": weather_severity,
                "expected_income": expected_inc,
                "actual_income": actual_income,
                "expected_vs_actual_ratio": expected_vs_actual,
                "city_encoded": city_encoded,
            }
        ]
    )
    predicted_loss = float(income_model.predict(income_input)[0])
    payout_amount = float(predicted_loss * 0.70)  # 70% coverage (as in docs)

    # --------------------------------------------
    # Model 3 — Parametric Trigger Engine
    # --------------------------------------------
    # Layer 1 — Rule scoring
    reasons = []
    score = 0
    if rainfall > 120:
        score += 3
        reasons.append("EXTREME_RAIN")
    elif rainfall > 90:
        score += 2
        reasons.append("HEAVY_RAIN")

    if aqi > 270:
        score += 3
        reasons.append("SEVERE_POLLUTION")
    elif aqi > 230:
        score += 2
        reasons.append("HIGH_AQI")

    if temperature > 40:
        score += 2
        reasons.append("EXTREME_HEAT")

    if delivery_drop > 0.60:
        score += 3
        reasons.append("HIGH_DELIVERY_DROP")
    elif delivery_drop > 0.45:
        score += 2
        reasons.append("MODERATE_DELIVERY_DROP")

    if float(risk_proba[2]) > 0.80:
        score += 2
        reasons.append("HIGH_RISK_SCORE")

    rule_trigger = score >= 5

    # Layer 2 — Isolation Forest anomaly
    # We don't know the exact training feature order here; we use a stable, documented set and pad/trim.
    try:
        n_anom = int(getattr(anomaly_scaler, "n_features_in_", 7))
    except Exception:
        n_anom = 7

    anom_features = [
        rainfall,
        temperature,
        aqi,
        delivery_drop,
        weather_severity,
        float(risk_proba[2]),
        float(score),
    ]
    anom_features = _pad_or_trim(anom_features, n_anom)
    anom_scaled = anomaly_scaler.transform([anom_features])
    anom_pred = int(isolation_model.predict(anom_scaled)[0])  # 1 normal, -1 anomaly
    anomaly_flag = anom_pred == -1

    # Final decision logic (per docs)
    if rule_trigger and anomaly_flag:
        trigger_status, trigger_confidence = "TRIGGERED", "HIGH"
    elif rule_trigger and (not anomaly_flag):
        trigger_status, trigger_confidence = "TRIGGERED", "MEDIUM"
    elif (not rule_trigger) and anomaly_flag:
        trigger_status, trigger_confidence = "REVIEW", "LOW"
    else:
        trigger_status, trigger_confidence = "NOT TRIGGERED", "NONE"

    triggered = trigger_status == "TRIGGERED"

    # --------------------------------------------
    # Model 4 — Fraud Detection (Isolation Forest)
    # --------------------------------------------
    income_loss_ratio = (predicted_loss / expected_inc) if expected_inc else 0.0
    loss_drop_mismatch = income_loss_ratio - delivery_drop
    claim_weather_mismatch = income_loss_ratio - weather_severity
    claim_without_trigger = 0 if triggered else (1 if predicted_loss > 1000 else 0)

    # payout_inflation_ratio: at prediction time we assume claim equals eligible payout => 1.0
    fraud_features = [
        income_loss_ratio,
        delivery_drop,
        1.0,
        loss_drop_mismatch,
        claim_weather_mismatch,
        claim_without_trigger,
        weather_severity,
        int(triggered),
        int(score),
    ]
    try:
        n_fraud = int(getattr(fraud_scaler, "n_features_in_", len(fraud_features)))
    except Exception:
        n_fraud = len(fraud_features)
    fraud_features = _pad_or_trim(fraud_features, n_fraud)

    fraud_scaled = fraud_scaler.transform([fraud_features])
    fraud_raw = float(fraud_model.score_samples(fraud_scaled)[0])
    fraud_score = float(max(0.0, min(1.0, (abs(fraud_raw) - 0.3) / 0.5)))
    fraud_flagged = fraud_score > 0.50

    # --------------------------------------------
    # Claim approval (what determines payout)
    # --------------------------------------------
    claim_approved = bool(triggered and (not fraud_flagged))
    approval_reasons = []
    if not triggered:
        approval_reasons.append("NO_PARAMETRIC_TRIGGER")
    if fraud_flagged:
        approval_reasons.append("FRAUD_FLAGGED")

    return {
        "city_supported": bool(city_supported),
        # Model 1 outputs
        "risk_level": risk_map.get(risk_pred, "Unknown"),
        "risk_prob_low": round(float(risk_proba[0]), 4),
        "risk_prob_med": round(float(risk_proba[1]), 4),
        "risk_prob_high": round(float(risk_proba[2]), 4),
        # Model 2 outputs
        "predicted_loss": round(predicted_loss, 2),
        "payout_amount": round(payout_amount, 2),
        # Model 3 outputs
        "triggered": bool(triggered),
        "trigger_status": trigger_status,
        "trigger_confidence": trigger_confidence,
        "anomaly_flag": bool(anomaly_flag),
        "trigger_score": int(score),
        "trigger_reasons": reasons,
        # Model 4 outputs
        "fraud_score": round(fraud_score, 4),
        "fraud_flagged": bool(fraud_flagged),
        # Approval outputs
        "claim_approved": bool(claim_approved),
        "approval_reasons": approval_reasons,
    }


if __name__ == "__main__":
    # Example usage (run from within the models dir)
    load_models(".")
    result = predict_all_api("Delhi", 5, 34, 295, 0.55, 4800)
    print(result)

