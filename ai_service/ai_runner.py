import sys
import json
import os


def main():
  try:
    raw = sys.stdin.read()
    body = json.loads(raw or "{}")

    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))

    # Lazy import to avoid heavy imports if unused
    from models.predict import load_models, predict_all_api  # type: ignore

    # Load pre-trained models (no training)
    load_models(models_dir)

    city = str(body.get("city") or "Mumbai")
    rainfall = float(body.get("rainfall", 0))
    temperature = float(body.get("temperature", 0))
    aqi = float(body.get("aqi", 0))
    delivery_drop = float(body.get("delivery_drop", 0))
    expected_income = float(body.get("expected_income", 0))

    result = predict_all_api(
      city=city,
      rainfall=rainfall,
      temperature=temperature,
      aqi=aqi,
      delivery_drop=delivery_drop,
      expected_inc=expected_income,
    )

    output = {
      "risk_level": result.get("risk_level"),
      "risk_prob_high": result.get("risk_prob_high"),
      "predicted_loss": result.get("predicted_loss"),
      "payout_amount": result.get("payout_amount"),
      "triggered": result.get("triggered"),
      "trigger_score": result.get("trigger_score"),
      "trigger_reasons": result.get("trigger_reasons"),
      "fraud_score": result.get("fraud_score"),
      "fraud_flagged": result.get("fraud_flagged"),
      # extras used by UI
      "trigger_status": result.get("trigger_status"),
      "claim_approved": result.get("claim_approved"),
      "approval_reasons": result.get("approval_reasons"),
      "city_supported": result.get("city_supported"),
    }

    sys.stdout.write(json.dumps(output))
    sys.stdout.flush()
  except Exception as e:
    sys.stderr.write(str(e))
    sys.stderr.flush()
    sys.exit(1)


if __name__ == "__main__":
  main()

