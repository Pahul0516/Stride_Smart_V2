from flask import Blueprint, request, jsonify, current_app
from app.services.AccessibilityPathService import AccessibilityPath
from itertools import pairwise

accessible_route_bp = Blueprint('accessible_route', __name__)

@accessible_route_bp.route('/get_accessible_path', methods=['POST'])
def get_accessible_route():

    G = current_app.config["CustomGraph"]
    accessibilityPath = AccessibilityPath(G)

    data = request.json
    start_coords = data.get('userLocation')
    goal_coords = data.get('destination')
    if goal_coords==0:
        return jsonify({'error': 'No destination provided'}), 400
    else:
        path = accessibilityPath.get_path(start_coords,goal_coords)
        coordinates = []
        for u, v in pairwise(path):
            # Get the coordinates for nodes u and v
            lat_u, lon_u = G.nodes[u]['y'], G.nodes[u]['x']
            lat_v, lon_v = G.nodes[v]['y'], G.nodes[v]['x']
                    
            # Add the coordinates to the list
            coordinates.append([lon_u, lat_u])
            coordinates.append([lon_v, lat_v])

        # Remove duplicate coordinates
        unique_coordinates = []
        for coord in coordinates:
            if coord not in unique_coordinates:
                unique_coordinates.append(coord)

        # Create GeoJSON response
        geojson_data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": unique_coordinates
                    },
                    "properties": {
                        "description": "Optimal walking route"
                    }
                }
            ]
        }
        # Return GeoJSON as a response
        return jsonify(geojson_data)