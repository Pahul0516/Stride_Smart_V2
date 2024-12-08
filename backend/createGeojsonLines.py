import geojson
import turfpy.measurement as turf
from geojson import Point, LineString, Feature, FeatureCollection


def points_to_lines(input_geojson_file, output_geojson_file):
    """Convert Point geometries in GeoJSON to LineString geometries."""
    # Load the GeoJSON file
    with open(input_geojson_file, 'r', encoding='utf-8') as file:
        data = geojson.load(file)

    # Extract points and sort them logically (e.g., by proximity)
    points = [feature for feature in data['features'] if feature['geometry']['type'] == 'Point']

    # Group points into lines (you can adjust the grouping logic here)
    lines = []
    for i in range(len(points) - 1):
        start_point = points[i]
        end_point = points[i + 1]

        # Create a LineString from consecutive points
        line = Feature(
            geometry=LineString([
                start_point['geometry']['coordinates'],
                end_point['geometry']['coordinates']
            ]),
            properties={
                "road_name": f"Road {i + 1}",
                "safety_level": start_point['properties']['grad']  # Use grad as a safety level
            }
        )
        lines.append(line)

    # Create the new GeoJSON FeatureCollection
    line_collection = FeatureCollection(lines)

    # Save to a new GeoJSON file
    with open(output_geojson_file, 'w', encoding='utf-8') as output_file:
        geojson.dump(line_collection, output_file, indent=4)

    print(f"Transformed GeoJSON saved to {output_geojson_file}")


# File paths
input_geojson = "../data/road_crash_density.geojson"  # Replace with your input file
output_geojson = "../data/safety_lines.geojson"  # Replace with your desired output file

# Convert Points to LineStrings
points_to_lines(input_geojson, output_geojson)
