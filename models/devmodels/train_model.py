"""
City Pulse Score - FINAL Model Training Script
"""

import numpy as np
import pickle
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

# ---------------------------
# Setup
# ---------------------------
np.random.seed(42)
N = 12000

# ---------------------------
# Synthetic Features
# ---------------------------

# Weather
weather_score = np.random.uniform(30, 90, N)

# Demand slightly depends on weather
demand_score = np.clip(
    np.random.uniform(50, 95, N) + (weather_score - 60) * 0.1,
    50, 95
)

# Traffic depends on demand (more demand → more congestion)
traffic_score = np.clip(
    np.random.uniform(40, 90, N) + (demand_score - 70) * 0.2,
    40, 90
)

# Risk penalty (skewed realistic)
risk_penalty = np.random.exponential(scale=10, size=N)
risk_penalty = np.clip(risk_penalty, 0, 40)

# ---------------------------
# Target (same as API logic)
# ---------------------------
raw_score = (
    0.35 * demand_score +
    0.25 * weather_score +
    0.20 * traffic_score -
    0.20 * risk_penalty
)

target = np.clip(raw_score, 0, 100)

# Add noise
target += np.random.normal(0, 2, N)
target = np.clip(target, 0, 100)

# ---------------------------
# Dataset
# ---------------------------
X = np.column_stack([
    weather_score,
    demand_score,
    traffic_score,
    risk_penalty
])

y = target

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ---------------------------
# Model
# ---------------------------
model = RandomForestRegressor(
    n_estimators=120,
    max_depth=12,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# ---------------------------
# Evaluation
# ---------------------------
y_pred = model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
r2  = r2_score(y_test, y_pred)

print(f"✅ Training complete | MAE: {mae:.3f} | R²: {r2:.4f}")

# ---------------------------
# Save
# ---------------------------
with open("city_pulse_model.pkl", "wb") as f:
    pickle.dump(model, f)

print("✅ Model saved → city_pulse_model.pkl")