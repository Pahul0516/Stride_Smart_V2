import geojson
from shapely.geometry import shape, Polygon

# Define Cluj bounding box (latitude and longitude)
from shapely.geometry import Polygon

cluj_napoca_expanded_bounds = Polygon([
    (23.5958866, 46.7717805),
    (23.6014665, 46.7717805),
    (23.6014665, 46.7747805),
    (23.5958865, 46.7747505),
    (23.5958866, 46.7717805)
])

# Load the existing GeoJSON file
with open("../file_copies/html/fixed_polygons.geojson") as f:
    data = geojson.load(f)

# Filter features to only include those within Cluj bounds
filtered_features = []

for feature in data['features']:
    if feature['geometry']['type'] == 'Polygon':
        polygon = shape(feature['geometry'])
        # Check if the feature is within bounds or has a specific name
        if polygon.within(cluj_napoca_expanded_bounds) or \
           ('name' in feature['properties'] and feature['properties']['name'] in ['Parcul Central', 'Grădina Botanică', 'Parcul Iuliu Hațieganu', 'Parcul Cetățuia', 'Parcul Etnografic', 'Cimitirul Crișan']):
            filtered_features.append(feature)

# Create new GeoJSON with filtered features
filtered_geojson = geojson.FeatureCollection(filtered_features)


# Save the filtered GeoJSON data to a new file
with open("../data/filtered_low_index_polygons.geojson", "w") as f:
    geojson.dump(filtered_geojson, f)

print("Filtered GeoJSON saved as 'filtered_cluj_polygons.geojson'")
