function clamp01(x) {
  const n = Number(x);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeTriggerScore(triggerScore, maxScore = 10) {
  return clamp01(Number(triggerScore || 0) / maxScore);
}

function weatherMatch({ rainfall, aqi }) {
  // As per spec: rainfall OR AQI above disruption threshold
  const rainHit = Number(rainfall) > 90; // heavy rain threshold
  const aqiHit = Number(aqi) > 230; // high AQI threshold
  return (rainHit || aqiHit) ? 1 : 0;
}

function behaviorConsistency({ delivery_drop, predicted_loss, expected_income }) {
  // Compare delivery drop vs income loss ratio => closer means more consistent (0..1)
  const drop = clamp01(delivery_drop);
  const exp = Number(expected_income || 0);
  const loss = Math.max(0, Number(predicted_loss || 0));
  const lossRatio = exp > 0 ? clamp01(loss / exp) : 0;
  const gap = Math.abs(lossRatio - drop); // 0..1
  return clamp01(1 - gap);
}

export function computeDecision(input) {
  const tNorm = normalizeTriggerScore(input.trigger_score);
  const wMatch = weatherMatch(input);
  const bCons = behaviorConsistency(input);
  const fraud = clamp01(input.fraud_score);

  let trust =
    (tNorm * 0.4) +
    (wMatch * 0.3) +
    (bCons * 0.2) -
    (fraud * 0.5);

  if (input.user_history?.past_fraud === true) trust -= 0.05;
  trust = clamp01(trust);

  const payoutAmount = Math.max(0, Number(input.payout_amount || 0));
  const triggered = Boolean(input.triggered);

  let decision = 'REJECTED';
  let final_payout = 0;
  let reason = '';

  if (trust >= 0.7) {
    decision = 'APPROVED';
    final_payout = payoutAmount;
    reason = 'High trust score based on trigger strength, weather match, and consistent behavior.';
  } else if (trust >= 0.4) {
    decision = 'PARTIAL';
    final_payout = payoutAmount * 0.6;
    reason = 'Medium trust score; partial payout applied to reduce risk.';
  } else {
    if (triggered) {
      decision = 'PARTIAL';
      final_payout = payoutAmount * 0.4;
      reason = 'Low trust score but disruption was triggered; minimal payout applied.';
    } else {
      decision = 'REJECTED';
      final_payout = 0;
      reason = 'Low trust score and no parametric trigger.';
    }
  }

  return {
    decision,
    trust_score: Number(trust.toFixed(4)),
    final_payout: Number(final_payout.toFixed(2)),
    reason,
    components: {
      trigger_score_norm: Number(tNorm.toFixed(4)),
      weather_match: wMatch,
      behavior_consistency: Number(bCons.toFixed(4)),
      fraud_score: Number(fraud.toFixed(4)),
      past_fraud_penalty: input.user_history?.past_fraud ? 0.05 : 0,
    },
  };
}

