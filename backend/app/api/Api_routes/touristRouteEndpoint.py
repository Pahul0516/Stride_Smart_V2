from flask import Blueprint, request, jsonify, current_app
from app.services.TouristPathService import TouristPath
from itertools import pairwise

tourist_route_bp = Blueprint('tourist_route', __name__)

@tourist_route_bp.route('/get_tourist_path',methods=['POST'])
def get_tourist_route():
    G = current_app.config["CustomGraph"]
    touristPath=TouristPath(G)

    data = request.json
    start_coords = data.get('startCoords')
    bucket_list=data.get('bucketList')
    touristPath.set_bucketList(bucket_list)

    path = touristPath.get_path(start_coords)
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
                    "description": "toruduf"
                }
            }
        ]
    }
    # Return GeoJSON as a response
    return jsonify(geojson_data)