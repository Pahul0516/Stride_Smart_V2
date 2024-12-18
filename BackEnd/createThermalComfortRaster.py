import json
from shapely.geometry import shape

def calculate_polygon_areas(geojson_file):
    """
    Calculates the area of each polygon in a GeoJSON file.
    
    Parameters:
        geojson_file (str): Path to the GeoJSON file.
        
    Returns:
        list: A list of dictionaries containing the polygon ID and its area.
    """
    i=0
    with open(geojson_file, 'r') as file:
        data = json.load(file)
    
    areas = []
    for feature in data['features']:
        print(i)
        # Ensure the geometry is a polygon or multipolygon
        geometry = feature['geometry']
        if geometry['type'] in ['Polygon', 'MultiPolygon']:
            polygon = shape(geometry)
            area = polygon.area  # Area in the coordinate system's units
            areas.append({
                'id': feature.get('id', None),  # Optional: Add feature ID if available
                'area': area
            })
        else:
            print(f"Skipping non-polygon feature: {feature.get('id', None)}")
    
    return areas

# Example usage
#geojson_file_path = 'static/data/filtered_cluj_polygons.geojson'
#polygon_areas = calculate_polygon_areas(geojson_file_path)
#for area_info in polygon_areas:
#    print(f"Polygon ID: {area_info['id']}, Area: {area_info['area']}")

import json
from shapely.geometry import shape, mapping

def convert_multipolygons_to_polygons(input_geojson_file, output_geojson_file):
    """
    Converts MultiPolygon geometries in a GeoJSON file into individual Polygon features.

    Parameters:
        input_geojson_file (str): Path to the input GeoJSON file.
        output_geojson_file (str): Path to save the output GeoJSON file with converted geometries.
    """
    # Load the GeoJSON data
    with open(input_geojson_file, 'r') as file:
        data = json.load(file)

    # Initialize a list to hold the new features
    new_features = []

    for feature in data['features']:
        geometry = shape(feature['geometry'])
        properties = feature.get('properties', {})
        
        # Check if the geometry is a MultiPolygon
        if geometry.geom_type == 'MultiPolygon':
            # Decompose into individual polygons
            for polygon in geometry.geoms:
                new_features.append({
                    'type': 'Feature',
                    'geometry': mapping(polygon),  # Convert Shapely geometry back to GeoJSON
                    'properties': properties  # Retain the original properties
                })
        elif geometry.geom_type == 'Polygon':
            # Keep existing polygons as-is
            new_features.append(feature)
        else:
            # Skip non-polygon geometries
            print(f"Skipping unsupported geometry type: {geometry.geom_type}")

    # Create a new GeoJSON FeatureCollection
    new_geojson = {
        'type': 'FeatureCollection',
        'features': new_features
    }

    # Save the new GeoJSON to a file
    with open(output_geojson_file, 'w') as file:
        json.dump(new_geojson, file, indent=4)

    print(f"Converted GeoJSON saved to {output_geojson_file}")

convert_multipolygons_to_polygons("static/data/cluj_green_areas.geojson","static/data/cluj_green_polygons.geojson")