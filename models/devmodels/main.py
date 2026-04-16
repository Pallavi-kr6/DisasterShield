"""
City Pulse Score — FINAL CLEAN VERSION (FIXED + OPTIMIZED)
"""

import os
import pickle
import datetime
import logging
import time
from functools import lru_cache

import numpy as np
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from pydantic import BaseModel
from shapely.geometry import Point

# ─────────────────────────────────────────
# ENV + CONFIG
# ─────────────────────────────────────────
load_dotenv()

MODEL_PATH = os.getenv("MODEL_PATH", "./city_pulse_model.pkl")
OWM_KEY = os.getenv("OWM_KEY", "YOUR_OPENWEATHERMAP_API_KEY")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────
# SOUTH INDIA CITIES  (for /cities dropdown)
# ─────────────────────────────────────────
SOUTH_INDIA_CITIES = [
    # Tamil Nadu
    {"name": "Chennai",           "state": "Tamil Nadu",    "lat": 13.0827, "lon": 80.2707},
    {"name": "Coimbatore",        "state": "Tamil Nadu",    "lat": 11.0168, "lon": 76.9558},
    {"name": "Madurai",           "state": "Tamil Nadu",    "lat":  9.9252, "lon": 78.1198},
    {"name": "Tiruchirappalli",   "state": "Tamil Nadu",    "lat": 10.7905, "lon": 78.7047},
    {"name": "Salem",             "state": "Tamil Nadu",    "lat": 11.6643, "lon": 78.1460},
    {"name": "Tirunelveli",       "state": "Tamil Nadu",    "lat":  8.7139, "lon": 77.7567},
    {"name": "Vellore",           "state": "Tamil Nadu",    "lat": 12.9165, "lon": 79.1325},
    {"name": "Erode",             "state": "Tamil Nadu",    "lat": 11.3410, "lon": 77.7172},
    {"name": "Tiruppur",          "state": "Tamil Nadu",    "lat": 11.1085, "lon": 77.3411},
    {"name": "Thoothukudi",       "state": "Tamil Nadu",    "lat":  8.7642, "lon": 78.1348},
    {"name": "Thanjavur",         "state": "Tamil Nadu",    "lat": 10.7870, "lon": 79.1378},
    {"name": "Dindigul",          "state": "Tamil Nadu",    "lat": 10.3624, "lon": 77.9695},
    {"name": "Kanchipuram",       "state": "Tamil Nadu",    "lat": 12.8386, "lon": 79.7006},
    {"name": "Cuddalore",         "state": "Tamil Nadu",    "lat": 11.7480, "lon": 79.7714},
    {"name": "Nagercoil",         "state": "Tamil Nadu",    "lat":  8.1833, "lon": 77.4119},
    # Karnataka
    {"name": "Bengaluru",         "state": "Karnataka",     "lat": 12.9716, "lon": 77.5946},
    {"name": "Mysuru",            "state": "Karnataka",     "lat": 12.2958, "lon": 76.6394},
    {"name": "Hubballi",          "state": "Karnataka",     "lat": 15.3647, "lon": 75.1240},
    {"name": "Mangaluru",         "state": "Karnataka",     "lat": 12.9141, "lon": 74.8560},
    {"name": "Belagavi",          "state": "Karnataka",     "lat": 15.8497, "lon": 74.4977},
    {"name": "Davanagere",        "state": "Karnataka",     "lat": 14.4644, "lon": 75.9218},
    {"name": "Ballari",           "state": "Karnataka",     "lat": 15.1394, "lon": 76.9214},
    {"name": "Shivamogga",        "state": "Karnataka",     "lat": 13.9299, "lon": 75.5681},
    {"name": "Tumakuru",          "state": "Karnataka",     "lat": 13.3379, "lon": 77.1173},
    {"name": "Udupi",             "state": "Karnataka",     "lat": 13.3409, "lon": 74.7421},
    # Kerala
    {"name": "Thiruvananthapuram","state": "Kerala",        "lat":  8.5241, "lon": 76.9366},
    {"name": "Kochi",             "state": "Kerala",        "lat":  9.9312, "lon": 76.2673},
    {"name": "Kozhikode",         "state": "Kerala",        "lat": 11.2588, "lon": 75.7804},
    {"name": "Thrissur",          "state": "Kerala",        "lat": 10.5276, "lon": 76.2144},
    {"name": "Kollam",            "state": "Kerala",        "lat":  8.8932, "lon": 76.6141},
    {"name": "Palakkad",          "state": "Kerala",        "lat": 10.7867, "lon": 76.6548},
    {"name": "Alappuzha",         "state": "Kerala",        "lat":  9.4981, "lon": 76.3388},
    {"name": "Kannur",            "state": "Kerala",        "lat": 11.8745, "lon": 75.3704},
    {"name": "Kottayam",          "state": "Kerala",        "lat":  9.5916, "lon": 76.5222},
    {"name": "Malappuram",        "state": "Kerala",        "lat": 11.0730, "lon": 76.0740},
    # Andhra Pradesh
    {"name": "Visakhapatnam",     "state": "Andhra Pradesh","lat": 17.6868, "lon": 83.2185},
    {"name": "Vijayawada",        "state": "Andhra Pradesh","lat": 16.5062, "lon": 80.6480},
    {"name": "Guntur",            "state": "Andhra Pradesh","lat": 16.3067, "lon": 80.4365},
    {"name": "Nellore",           "state": "Andhra Pradesh","lat": 14.4426, "lon": 79.9865},
    {"name": "Kurnool",           "state": "Andhra Pradesh","lat": 15.8281, "lon": 78.0373},
    {"name": "Tirupati",          "state": "Andhra Pradesh","lat": 13.6288, "lon": 79.4192},
    {"name": "Rajahmundry",       "state": "Andhra Pradesh","lat": 17.0005, "lon": 81.8040},
    {"name": "Kakinada",          "state": "Andhra Pradesh","lat": 16.9891, "lon": 82.2475},
    {"name": "Anantapur",         "state": "Andhra Pradesh","lat": 14.6819, "lon": 77.6006},
    {"name": "Kadapa",            "state": "Andhra Pradesh","lat": 14.4674, "lon": 78.8241},
    {"name": "Ongole",            "state": "Andhra Pradesh","lat": 15.5057, "lon": 80.0499},
    # Telangana
    {"name": "Hyderabad",         "state": "Telangana",     "lat": 17.3850, "lon": 78.4867},
    {"name": "Warangal",          "state": "Telangana",     "lat": 17.9784, "lon": 79.5941},
    {"name": "Nizamabad",         "state": "Telangana",     "lat": 18.6725, "lon": 78.0941},
    {"name": "Karimnagar",        "state": "Telangana",     "lat": 18.4386, "lon": 79.1288},
    {"name": "Khammam",           "state": "Telangana",     "lat": 17.2473, "lon": 80.1514},
    {"name": "Ramagundam",        "state": "Telangana",     "lat": 18.8066, "lon": 79.4737},
    {"name": "Mahbubnagar",       "state": "Telangana",     "lat": 16.7488, "lon": 77.9835},
    {"name": "Nalgonda",          "state": "Telangana",     "lat": 17.0575, "lon": 79.2670},
]

# ─────────────────────────────────────────
# LOAD MODEL + GEO DATA
# ─────────────────────────────────────────
print("🚀 Starting City Pulse API...")

try:
    with open(MODEL_PATH, "rb") as f:
        ml_model = pickle.load(f)
    print("✅ ML model loaded")
except Exception as e:
    logger.error(f"Model load failed: {e}")
    ml_model = None

try:
    with open("geo_data.pkl", "rb") as f:
        grid = pickle.load(f)
    print("✅ Geo data loaded")
except Exception as e:
    logger.error(f"Geo load failed: {e}")
    grid = None

# ─────────────────────────────────────────
# GEO FALLBACK
# ─────────────────────────────────────────
GEO_FALLBACK = {
    "road_count": 0,
    "building_density": 0,
    "transport_density": 0,
    "traffic_density": 0,
    "flood_presence": 0,
}

# ─────────────────────────────────────────
# GEO LOOKUP
# ─────────────────────────────────────────
@lru_cache(maxsize=10000)
def extract_geo_features(lat, lon):
    if grid is None:
        return GEO_FALLBACK

    try:
        point = Point(lon, lat)
        possible = grid.cx[lon:lon, lat:lat]
        exact = possible[possible.geometry.contains(point)]

        if exact.empty:
            return GEO_FALLBACK

        row = exact.iloc[0]

        return {
            "road_count": int(row.get("road", 0)),
            "building_density": int(row.get("building", 0)),
            "transport_density": int(row.get("transport", 0)),
            "traffic_density": int(row.get("traffic", 0)),
            "flood_presence": int(row.get("flood", 0)),
        }

    except Exception as e:
        logger.error(f"Geo error: {e}")
        return GEO_FALLBACK

# ─────────────────────────────────────────
# NORMALIZATION
# ─────────────────────────────────────────
def normalize_geo(geo):
    return {
        "road": np.log1p(geo["road_count"]),
        "building": np.log1p(geo["building_density"]),
        "transport": np.log1p(geo["transport_density"]),
        "traffic": np.log1p(geo["traffic_density"]),
        "flood": geo["flood_presence"],
    }

# ─────────────────────────────────────────
# WEATHER
# ─────────────────────────────────────────
WEATHER_CACHE = {}
WEATHER_TTL = 600

def get_weather(lat, lon):
    rlat, rlon = round(lat, 2), round(lon, 2)
    now = time.time()

    if (rlat, rlon) in WEATHER_CACHE:
        data, ts = WEATHER_CACHE[(rlat, rlon)]
        if now - ts < WEATHER_TTL:
            return data

    url = f"https://api.openweathermap.org/data/2.5/weather?lat={rlat}&lon={rlon}&appid={OWM_KEY}&units=metric"

    try:
        resp = requests.get(url, timeout=3)
        resp.raise_for_status()
        data = resp.json()

        cond = data["weather"][0]["main"].lower()
        temp = float(data["main"]["temp"])
        desc = data["weather"][0]["description"].title()

    except Exception:
        cond, temp, desc = "clouds", 25.0, "Fallback Weather"

    base = {
        "clear": 85,
        "clouds": 70,
        "rain": 30,
        "drizzle": 30,
        "thunderstorm": 20,
    }.get(cond, 60)

    temp_adj = 0 if 15 <= temp <= 35 else -10
    score = float(np.clip(base + temp_adj, 0, 100))

    result = {
        "weather_score": score,
        "condition": desc,
        "temperature": temp,
    }

    WEATHER_CACHE[(rlat, rlon)] = (result, now)
    return result

# ─────────────────────────────────────────
# SCORING FUNCTIONS (IMPROVED)
# ─────────────────────────────────────────
def demand_score(building, transport):
    hour = datetime.datetime.now().hour

    peak = 20 if (7 <= hour < 10 or 18 <= hour < 22) else 0
    return float(np.clip(50 + peak + transport * 5 + building * 1.0, 50, 95))


def traffic_score_fn(traffic, roads):
    return float(np.clip(60 + roads * 2 - traffic * 1.0, 20, 90))


def risk_penalty_fn(flood, traffic):
    base = 10 if flood else 0
    return float(np.clip(base + traffic * 0.5, 0, 25))


def predict_score(w, d, t, r):
    # ML prediction
    try:
        X = np.array([[w, d, t, r]])
        ml_score = float(ml_model.predict(X)[0]) if ml_model else 50
    except:
        ml_score = 50

    # Rule-based
    rule_score = (0.3 * w + 0.4 * d + 0.3 * t - 0.15 * r)

    # Hybrid
    final = 0.5 * ml_score + 0.5 * rule_score

    return round(float(np.clip(final, 0, 100)), 2)

# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────
def get_status(score):
    if score >= 70:
        return "Good"
    elif score >= 45:
        return "Moderate"
    return "Avoid"


def get_insight(weather, flood):
    parts = []

    if flood:
        parts.append("Flood risk nearby.")
    if "rain" in weather.lower():
        parts.append("Bad weather impact.")

    return " ".join(parts) or "Normal conditions."


def get_recommendation(score):
    if score >= 70:
        return "Great time to work."
    elif score >= 45:
        return "Moderate conditions."
    return "Avoid working now."

# ─────────────────────────────────────────
# FASTAPI
# ─────────────────────────────────────────
app = FastAPI(title="City Pulse Score API")

class ScoreResponse(BaseModel):
    city_pulse_score: float
    status: str
    weather: str
    temperature: float
    road_count: int
    building_density: int
    traffic_density: int
    transport_density: int
    risk_penalty: int
    insight: str
    recommendation: str


class CityInfo(BaseModel):
    name: str
    state: str
    lat: float
    lon: float


# ─────────────────────────────────────────
# /cities  — full dropdown list
# ─────────────────────────────────────────
@app.get("/cities", response_model=list[CityInfo])
def list_cities():
    """
    Returns all supported South Indian cities with lat/lon.
    Use this to populate a frontend dropdown, then pass the
    chosen city name to /score/city  OR  pass lat/lon to /score.
    """
    return SOUTH_INDIA_CITIES


# ─────────────────────────────────────────
# /score/city  — score by city name
# ─────────────────────────────────────────
@app.get("/score/city", response_model=ScoreResponse)
def get_score_by_city(
    city: str = Query(..., description="City name, e.g. Chennai")
):
    """
    Select a city from the dropdown and get its City Pulse Score.
    City name is case-insensitive.
    """
    match = next(
        (c for c in SOUTH_INDIA_CITIES if c["name"].lower() == city.strip().lower()),
        None,
    )
    if match is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=404,
            detail=f"City '{city}' not found. Call /cities to see the full list.",
        )
    return get_score(lat=match["lat"], lon=match["lon"])


@app.get("/score", response_model=ScoreResponse)
def get_score(lat: float = Query(...), lon: float = Query(...)):

    geo = extract_geo_features(lat, lon)
    norm = normalize_geo(geo)
    wx = get_weather(lat, lon)

    d = demand_score(norm["building"], norm["transport"])
    t = traffic_score_fn(norm["traffic"], norm["road"])
    r = risk_penalty_fn(norm["flood"], norm["traffic"])

    score = predict_score(wx["weather_score"], d, t, r)

    return ScoreResponse(
        city_pulse_score=score,
        status=get_status(score),
        weather=wx["condition"],
        temperature=wx["temperature"],
        road_count=geo["road_count"],
        building_density=geo["building_density"],
        traffic_density=geo["traffic_density"],
        transport_density=geo["transport_density"],
        risk_penalty=int(r),
        insight=get_insight(wx["condition"], geo["flood_presence"]),
        recommendation=get_recommendation(score),
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": ml_model is not None,
        "geo_loaded": grid is not None,
    }