import json

# Input file with separate JSON objects
input_file = "html\green_spaces_polygon.geojson"  # Replace with your filename
output_file = "html/fixed_polygons.geojson"

features = []

# Read each line and convert it to a feature
with open(input_file, "r") as f:
    for line in f:
        polygon = json.loads(line.strip())  # Parse each line as JSON
        features.append({
            "type": "Feature",
            "geometry": polygon,
            "properties": {}
        })

# Create the FeatureCollection
geojson = {
    "type": "FeatureCollection",
    "features": features
}

# Write to a valid GeoJSON file
with open(output_file, "w") as f:
   json.dump(geojson, f, indent=4)

print(f"GeoJSON saved to {output_file}")
