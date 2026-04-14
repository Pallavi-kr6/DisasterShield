import React from 'react';
import { MapContainer, TileLayer, Circle, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';

function mapRiskLevel(level) {
  const norm = String(level).toUpperCase();
  if (norm === "HIGH") return 80;
  if (norm === "MEDIUM") return 50;
  return 20;
}

function getColor(risk) {
  if (risk > 70) return "red";
  if (risk > 40) return "orange";
  return "#10b981"; // green
}

function getRadius(risk) {
  // Scale radius with risk, base 50km up to ~150km
  return 30000 + (risk * 1000);
}

// Fallback logic to gently spread out unknown city claims over India for visualization
const mapCityCoordinates = (index) => {
  const seed = index * 137;
  return {
    lat: 16 + (seed % 10),
    lon: 73 + ((seed * 7) % 15)
  };
};

const Heatmap = ({ claims = [] }) => {
  const zones = claims.map((c, i) => {
    const lat = c.lat || mapCityCoordinates(i).lat;
    const lon = c.lon || mapCityCoordinates(i).lon;
    return {
      id: c.id || `zone-${i}`,
      city: c.city || `Zone ${i + 1}`,
      lat,
      lon,
      risk: c.risk_score || mapRiskLevel(c.risk_level)
    };
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
    >
      <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white text-glow-blue tracking-wide">
            Disaster Risk Heatmap
          </h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-semibold">
            Real-time Threat Visualization Map
          </p>
        </div>
      </div>

      <div className="w-full h-[400px] rounded-xl overflow-hidden border border-white/5 relative z-10">
        <MapContainer 
          center={[20.5937, 78.9629]} 
          zoom={5} 
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
            opacity={0.6}
            className="map-tiles" // Added in case user wants to filter map color later
          />
          
          {zones.map((zone) => (
            <Circle
              key={zone.id}
              center={[zone.lat, zone.lon]}
              radius={getRadius(zone.risk)}
              pathOptions={{
                fillColor: getColor(zone.risk),
                color: getColor(zone.risk),
                weight: 1,
                fillOpacity: 0.5,
              }}
            >
              <Tooltip className="bg-slate-900 text-white border-none rounded shadow-2xl">
                <div className="p-1">
                  <div className="font-bold text-sm mb-1">{zone.city}</div>
                  <div className="text-xs uppercase tracking-widest text-slate-400">
                    Risk Score: <span className="text-white font-bold">{zone.risk}</span>
                  </div>
                </div>
              </Tooltip>
            </Circle>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Risk Level</div>
        <div className="flex items-center gap-3 w-full md:w-1/2">
          <span className="text-xs text-emerald-400 font-bold">LOW</span>
          <div className="h-3 rounded-full flex-1 bg-gradient-to-r from-emerald-500 via-orange-500 to-red-500 shadow-[0_0_15px_rgba(255,255,255,0.1)]"></div>
          <span className="text-xs text-red-400 font-bold">HIGH</span>
        </div>
      </div>
      
      <style>{`
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-tooltip {
          background: rgba(15, 23, 42, 0.95) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: white !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5) !important;
        }
        .leaflet-tooltip::before {
          border-top-color: rgba(15, 23, 42, 0.95) !important;
        }
        .map-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
      `}</style>
    </motion.div>
  );
};

export default Heatmap;
