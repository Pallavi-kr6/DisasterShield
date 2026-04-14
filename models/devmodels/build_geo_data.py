import geopandas as gpd
import numpy as np
import pickle
from shapely.geometry import box

# -------------------------
# LOAD SHAPEFILES
# -------------------------
roads = gpd.read_file("shapefiles/gis_osm_roads_free_1.shp")
buildings = gpd.read_file("shapefiles/gis_osm_buildings_a_free_1.shp")
transport = gpd.read_file("shapefiles/gis_osm_transport_free_1.shp")
traffic = gpd.read_file("shapefiles/gis_osm_traffic_free_1.shp")
water = gpd.read_file("shapefiles/gis_osm_water_a_free_1.shp")

# Ensure CRS
roads = roads.to_crs(4326)
buildings = buildings.to_crs(4326)
transport = transport.to_crs(4326)
traffic = traffic.to_crs(4326)
water = water.to_crs(4326)

# -------------------------
# CREATE GRID (South India)
# -------------------------
xmin, ymin, xmax, ymax = 74, 8, 85, 20
grid_size = 0.05  # ~5km

cells = []
for x in np.arange(xmin, xmax, grid_size):
    for y in np.arange(ymin, ymax, grid_size):
        cells.append(box(x, y, x + grid_size, y + grid_size))

grid = gpd.GeoDataFrame(geometry=cells, crs="EPSG:4326")

# -------------------------
# FLOOD BUFFER (CORRECT)
# -------------------------
water_proj = water.to_crs(3857)
flood = water_proj.buffer(200).to_crs(4326)
flood = gpd.GeoDataFrame(geometry=flood, crs=4326)

# -------------------------
# COUNT FEATURES
# -------------------------
def count_features(source, grid):
    joined = gpd.sjoin(grid, source, how="left", predicate="intersects")
    return joined.groupby(joined.index).size().fillna(0)

print("⏳ Computing features...")

grid["road"] = count_features(roads, grid)
grid["building"] = count_features(buildings, grid)
grid["transport"] = count_features(transport, grid)
grid["traffic"] = count_features(traffic, grid)
grid["flood"] = count_features(flood, grid)

# -------------------------
# SAVE
# -------------------------
with open("geo_data.pkl", "wb") as f:
    pickle.dump(grid, f)

print("✅ geo_data.pkl created successfully")