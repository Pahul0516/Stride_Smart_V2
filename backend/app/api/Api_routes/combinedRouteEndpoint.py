from flask import Blueprint, request, jsonify, current_app
from app.services.CombinedCriteriaPathService import CombinedCriteriaPath
from itertools import pairwise

combined_route_bp = Blueprint('combined_route', __name__)


@combined_route_bp.route('/get_combined_path',methods=['POST'])
def get_combined_route():

    G = current_app.config["CustomGraph"]
    combinedCriteriaPath = CombinedCriteriaPath(G) # PROBLEME LA bd

    data = request.json
    combinedCriteriaPath.is_thermal_comfort=data.get('is_thermal_comfort')
    combinedCriteriaPath.is_air_quality=data.get('is_air_quality')
    combinedCriteriaPath.is_green=data.get('is_green')
    combinedCriteriaPath.is_safe=data.get('is_safe')
    combinedCriteriaPath.is_accessible=data.get('is_accessible')
    start_coords = data.get('userLocation')
    goal_coords = data.get('destination')
    if goal_coords==None:
        return jsonify({'error': 'No destination provided'}), 400
    else:
        path = combinedCriteriaPath.get_path(start_coords,goal_coords,alpha = 0.5, beta = 0.5)
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