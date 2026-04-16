import logging
import os
import pickle
import random
from typing import Optional

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
MODEL_PATH = "city_pulse_model.pkl"
GEO_DATA_PATH = "geo_data.pkl"

def load_geo_data(city: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None) -> dict:
    """
    Loads geospatial densities and traffic data. 
    Attempts to read from geo_data.pkl, otherwise falls back to mocked data.
    """
    try:
        if os.path.exists(GEO_DATA_PATH):
            with open(GEO_DATA_PATH, "rb") as f:
                data = pickle.load(f)
                logger.info(f"Loaded geo data from {GEO_DATA_PATH}")
                return data
    except Exception as e:
        logger.warning(f"Failed to load geo data from {GEO_DATA_PATH}: {e}. Using mock data.")

    # Mocked data 
    return {
        "roads_density": random.uniform(0.4, 0.9),
        "buildings_density": random.uniform(0.3, 0.8),
        "traffic_indicators": random.uniform(0.2, 0.7),
        "transport_availability": random.uniform(0.5, 1.0),
        "flood_risk": random.uniform(0.0, 0.5)
    }

def fetch_weather_data(city: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None) -> dict:
    """
    Fetches real-time weather data. Mocks API interaction.
    Never crashes even if weather API fails.
    """
    try:
        # Simulate an API call logic here
        return {
            "temperature": random.uniform(15.0, 40.0),
            "conditions": random.choice(["Clear", "Rain", "Cloudy", "Storm"]),
            "rain_prob": random.uniform(0.0, 1.0),
            "severe_weather_alert": random.choice([True, False, False, False])
        }
    except Exception as e:
        logger.error(f"Weather API error: {e}. Falling back to default values.")
        return {
            "temperature": 25.0,
            "conditions": "Unknown",
            "rain_prob": 0.0,
            "severe_weather_alert": False
        }

def normalize_features(value: float, min_val: float, max_val: float) -> float:
    """
    Normalizes inputs to safely scale between 0.0 and 1.0.
    """
    safe_range = max((max_val - min_val), 1e-6)
    return max(0.0, min(1.0, (value - min_val) / safe_range))

def compute_demand(geo: dict) -> float:
    """
    Calculates demand score based on normalized infrastructure and traffic indices.
    """
    roads = normalize_features(geo.get("roads_density", 0.5), 0, 1)
    buildings = normalize_features(geo.get("buildings_density", 0.5), 0, 1)
    traffic = normalize_features(geo.get("traffic_indicators", 0.5), 0, 1)
    transport = normalize_features(geo.get("transport_availability", 0.5), 0, 1)

    # Weighted calculation
    score = (roads * 0.25) + (buildings * 0.25) + (traffic * 0.2) + (transport * 0.3)
    return score

def compute_risk(geo: dict, weather: dict) -> float:
    """
    Calculates operational risk penalty based on natural conditions.
    """
    flood_risk = normalize_features(geo.get("flood_risk", 0.2), 0, 1)
    rain = weather.get("rain_prob", 0.0)
    severe_alert = 0.3 if weather.get("severe_weather_alert", False) else 0.0
    
    score = (flood_risk * 0.3) + (rain * 0.4) + severe_alert
    return min(1.0, score)

def calculate_city_pulse_score(city: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None) -> dict:
    """
    Combines Geo, Weather, and ML properties to generate a final City Pulse score (0-100).
    """
    logger.info(f"Calculating pulse score for {city or 'Unknown location'} at ({lat}, {lon})")
    
    try:
        geo = load_geo_data(city, lat, lon)
        weather = fetch_weather_data(city, lat, lon)
        
        demand = compute_demand(geo)
        risk = compute_risk(geo, weather)
        
        # Load ML model
        model = None
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    model = pickle.load(f)
                    logger.info(f"Successfully loaded {MODEL_PATH}")
            except Exception as e:
                logger.warning(f"Error loading {MODEL_PATH}: {e}")
        
        # Calculate base score
        if model and hasattr(model, "predict"):
            # Typically features need to be shaped correctly for ML model
            # Mocking the ML interaction pattern gracefully
            try:
                prediction = model.predict([[demand, risk]])[0]
                base_score = float(prediction)
            except Exception:
                base_score = max(0.0, demand - (risk * 1.5)) * 100
        else:
            # Rule-based fallback
            base_score = max(0.0, demand - (risk * 1.5)) * 100

        final_score = int(max(0, min(100, base_score)))
        
        # Output categorizations
        status = "Good"
        if final_score < 40:
            status = "Avoid"
        elif final_score < 70:
            status = "Moderate"
            
        insights = []
        if demand > 0.7:
            insights.append("High demand activity in this area.")
        elif demand < 0.3:
            insights.append("Low activity region.")
            
        if risk > 0.6:
            insights.append("Elevated environmental risks detected.")
            
        if weather.get("severe_weather_alert"):
            insights.append("Active severe weather alert for the location.")
            
        recommendations = []
        if status == "Good":
            recommendations.append("Safe for general operations.")
        elif status == "Moderate":
            recommendations.append("Proceed with caution. Check local weather patterns.")
        else:
            recommendations.append("Halt active operations. High risk factors or exceptionally low demand present.")

        return {
            "score": final_score,
            "status": status,
            "insights": insights,
            "recommendations": recommendations,
            "metadata": {
                "weather": weather["conditions"],
                "temperature": weather["temperature"]
            }
        }
        
    except Exception as e:
        logger.error(f"Critical error calculating pulse score: {e}")
        return {
            "score": 50,
            "status": "Moderate",
            "insights": ["System encountered internal error while processing metrics."],
            "recommendations": ["Fallback data enabled. Await further updates."]
        }
