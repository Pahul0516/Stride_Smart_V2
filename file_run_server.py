from itertools import islice, tee
import psycopg2
import json
from flask import Flask, jsonify, render_template, request, Blueprint
from networkx import shortest_simple_paths
import osmnx as ox
import networkx as nx
import matplotlib.pyplot as plt
import os
from flask_cors import CORS
from shapely import MultiPolygon, STRtree
from shapely.geometry import shape, LineString, Polygon
from geopy.distance import geodesic
import geojson

class AccidentAwareRouteFinder:
    def __init__(self, G, db_config):
        """
        Initialize the route finder with database configuration and location.
        """
        self.db_config = db_config
        self.G = G
        self.place = "Cluj-Napoca, Romania"
        self.network_type = "walk"

    def closest_edge_to_point(self, point):
        """
        Find the closest edge in the graph to a given point.
        """
        min_dist = float('inf')
        closest_edge = None
        for u, v, data in self.G.edges(data=True):
            u_coords = (self.G.nodes[u]['x'], self.G.nodes[u]['y'])
            v_coords = (self.G.nodes[v]['x'], self.G.nodes[v]['y'])
            edge_line = LineString([u_coords, v_coords])
            dist = point.distance(edge_line)
            if dist < min_dist:
                min_dist = dist
                closest_edge = (u, v)
        return closest_edge

    def initialize_graph(self):
        """
        Fetch accident data from the database and initialize the graph.
        """
        try:
            conn = psycopg2.connect(**self.db_config)
            query = "SELECT id_accident, grad, coordonate FROM accident;"
            # Initialize the accident_frequency for all edges to 0
            for u, v, key, data in self.G.edges(keys=True, data=True):
                data['accident_frequency'] = 0  # Add 'accident_frequency' attribute with value 0 
            with conn.cursor() as cursor:
                cursor.execute(query)
                results = cursor.fetchall()
                for i, row in enumerate(results):
                    print(f"Processing accident {i+1}")
                    point = self.convert_wkb_to_point(row[2])
                    edge = self.closest_edge_to_point(point)
                    if edge:
                        u, v = edge  # Unpack edge tuple
                        for key in self.G[u][v]:  # Loop over all keys for this edge
                            if 'accident_frequency' not in self.G[u][v][key]:  # Initialize if not present
                                self.G[u][v][key]['accident_frequency'] = 0
                            self.G[u][v][key]['accident_frequency'] += row[1]  # Increment by accident severity (grad)
        
        except psycopg2.Error as e:
            print(f"Error connecting to PostgreSQL: {e}")

    def custom_cost(self, u, v, data):
        """
        Custom cost function for A* algorithm considering accident frequency.
        """
        length = data[0].get('length', float('inf'))  # Use a large value if length is missing
        accident_frequency = data[0].get('accident_frequency', 0)
        accident_penalty = accident_frequency * 10
        return length + accident_penalty

    def heuristic(self, u, v):
        """
        Heuristic function for A* algorithm using Euclidean distance.
        """
        (x1, y1) = self.G.nodes[u]['x'], self.G.nodes[u]['y']
        (x2, y2) = self.G.nodes[v]['x'], self.G.nodes[v]['y']
        return ((x2 - x1) * 2 + (y2 - y1) * 2) ** 0.5  # Euclidean distance

    @staticmethod
    def convert_wkb_to_point(WKB_str):
        """
        Convert WKB string to a Shapely Point object.
        """
        wkb_string = bytes.fromhex(WKB_str)
        return wkb.loads(wkb_string)
    
    def pairwise(self,iterable):
        """Return successive pairs from the input iterable.
        For example, pairwise([1, 2, 3, 4]) -> (1, 2), (2, 3), (3, 4)
        """
        a, b = tee(iterable)
        next(b, None)
        return zip(a, b)

    def find_route(self):
        """
        Find and plot the route considering accident frequency.
        """
        self.initialize_graph()
        data = request.json
        user_location = data.get('userLocation')
        destination = data.get('destination')

        for u, v, data in self.G.edges(data=True):
            length = data.get('length', float('inf'))  # Use a large value if length is missing
            print(f"Length for edge ({u}, {v}): {length}")

        # Find the nearest nodes to the start and goal coordinates
        start_node = ox.distance.nearest_nodes(G, X=user_location['lng'], Y=user_location['lat'])
        goal_node = ox.distance.nearest_nodes(G, X=destination['lng'], Y=destination['lat'])

        # Find the path using A* algorithm
        path = nx.astar_path(self.G, source=start_node, target=goal_node,
                             weight=self.custom_cost, heuristic=self.heuristic)

        coordinates = []
        for u, v in self.pairwise(path):
                # Get the coordinates for nodes u and v
            lat_u, lon_u = self.G.nodes[u]['y'], self.G.nodes[u]['x']
            lat_v, lon_v = self.G.nodes[v]['y'], self.G.nodes[v]['x']
                
                # Add the coordinates to the list
            coordinates.append([lon_u, lat_u])
            coordinates.append([lon_v, lat_v])

            # Remove duplicate coordinates
        unique_coordinates = []
        for coord in coordinates:
            if coord not in unique_coordinates:
                unique_coordinates.append(coord)
        
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
        return jsonify(geojson_data)
    
class GreenRouteFinder:
    def __init__(self, graph,db_config):
        """
        Initialize the route finder with database configuration and location.
        """
        self.db_config = db_config
        self.G = graph
        json_file = "static/data/filtered_cluj_polygons.geojson"
        green_polygons = self.load_green_polygons(json_file) 
        self.green_polygons=green_polygons
        self.blueprint = Blueprint('green_route', __name__)  # Create a Blueprint
        self.add_routes()  # Register routes for this class

    def load_green_polygons(self,json_file):
        """
        Load green polygons from a GeoJSON file.

        Parameters:
        - json_file (str): Path to the GeoJSON file.

        Returns:
        - list: A list of shapely Polygon objects.
        """
        with open(json_file, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        
        polygons = []
        for feature in geojson_data['features']:
            geom = feature['geometry']
            polygons.append(shape(geom))  # Convert geometry to Shapely Polygon
        return polygons

    def find_route(self):
            print('reached backend')
            data = request.json
            user_location = data.get('userLocation')
            destination = data.get('destination')

            # Find the nearest nodes to user location and destination
            start_node = ox.distance.nearest_nodes(G, X=user_location['lng'], Y=user_location['lat'])
            end_node = ox.distance.nearest_nodes(G, X=destination['lng'], Y=destination['lat'])
            
            routes=self.get_diverse_paths(start_node,end_node,20)
            # Get k shortest simple paths
            best_route=self.get_best_route(routes)
            
            coordinates = []
            for u, v in self.pairwise(best_route):
                # Get the coordinates for nodes u and v
                lat_u, lon_u = self.G.nodes[u]['y'], self.G.nodes[u]['x']
                lat_v, lon_v = self.G.nodes[v]['y'], self.G.nodes[v]['x']
                
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
            print('donee')
            # Return GeoJSON as a response
            return jsonify(geojson_data)

    def add_routes(self):
        @self.blueprint.route('/get_greenest_path', methods=['POST'])
        def get_greenest_path():
            print('reached backend')
            data = request.json
            user_location = data.get('userLocation')
            destination = data.get('destination')

            # Find the nearest nodes to user location and destination
            start_node = ox.distance.nearest_nodes(G, X=user_location['lng'], Y=user_location['lat'])
            end_node = ox.distance.nearest_nodes(G, X=destination['lng'], Y=destination['lat'])
            
            routes=self.get_diverse_paths(start_node,end_node,20)
            # Get k shortest simple paths
            best_route=self.get_best_route(routes)
            
            coordinates = []
            for u, v in self.pairwise(best_route):
                # Get the coordinates for nodes u and v
                lat_u, lon_u = self.G.nodes[u]['y'], self.G.nodes[u]['x']
                lat_v, lon_v = self.G.nodes[v]['y'], self.G.nodes[v]['x']
                
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
            print('donee')
            # Return GeoJSON as a response
            return jsonify(geojson_data)

    def get_route_length(self,route):
        """
        Calculate the total length of a route based on node coordinates.
        
        Parameters:
        - route: List of node IDs representing the route.
        - graph: The OSMnx graph containing node data.
        
        Returns:
        - Total route length in meters.
        """
        total_length=0

        # Iterate over consecutive pairs of nodes in the route using pairwise
        for u, v in self.pairwise(route):
            # Get coordinates for nodes u and v
            lat_u, lon_u = self.G.nodes[u]['y'], self.G.nodes[u]['x']
            lat_v, lon_v = self.G.nodes[v]['y'], self.G.nodes[v]['x']

            # Calculate haversine distance between the nodes
            distance = geodesic((lat_u, lon_u), (lat_v, lon_v)).meters

            # Add the distance to the total
            total_length += distance

        return total_length
    
    def get_route_buffer(self,route, buffer_distance=10):
        """
        Create a buffer around the route (edges) with a given distance.
        :param route: A list of nodes representing the route.
        :param graph: The graph object.
        :param buffer_distance: The distance (in meters) to create the buffer around the route.
        :return: A list of buffered geometries around each edge of the route.
        """
        route_buffers = []
        
        for u, v in self.pairwise(route):
            # Get the coordinates of the nodes u and v
            coords_u = (self.G.nodes[u]['x'], self.G.nodes[u]['y'])
            coords_v = (self.G.nodes[v]['x'], self.G.nodes[v]['y'])
            
            # Create a LineString for the edge (u, v)
            edge_line = LineString([coords_u, coords_v])
            
            # Create a buffer around the edge with the specified distance
            buffer = edge_line.buffer(buffer_distance)
            
            route_buffers.append(buffer)
        
        return route_buffers

    def filter_polygons_by_buffer(self,route_buffers):
        """
        Filter polygons by checking if their centroids or bounding boxes intersect with any of the route buffers.
        :param polygons: List of shapely Polygon objects representing green spaces.
        :param route_buffers: List of shapely geometries representing the route buffers.
        :return: List of polygons that intersect with any route buffer.
        """
        filtered_polygons = []
        
        for polygon in self.green_polygons:
            for buffer in route_buffers:
                # Check if the polygon intersects with any buffer
                if polygon.intersects(buffer):
                    filtered_polygons.append(polygon)
                    break  # If one buffer intersects, no need to check further buffers
        
        return filtered_polygons

    def get_best_route(self,routes):
        """
        Select the best route based on the highest intersection with green spaces.
        
        Parameters:
        - graph: The OSMnx graph containing node data (latitude, longitude).
        - routes: A list of routes, where each route is a list of node IDs.
        - green_polygons: A list of polygons representing green spaces.
        
        Returns:
        - The best route, represented as a list of node IDs.
        """
        
        # Build a spatial index for the green polygons
        polygon_index = STRtree(self.green_polygons)

        max_index = 0
        best_route = None

        for route in routes:
            intersection_length = 0
            route_length = self.get_route_length(route)

            if route_length == 0:
                continue

            # Iterate over edges in the route
            for u, v in self.pairwise(route):
                # Create a LineString for the edge
                coordinates = [
                    [self.G.nodes[u]["x"], self.G.nodes[u]["y"]],
                    [self.G.nodes[v]["x"], self.G.nodes[v]["y"]],
                ]
                edge_line = LineString(coordinates)

                # Buffer the edge (10 meters)
                buffered_edge = edge_line.buffer(10)

                # Use spatial index to find potential intersecting polygons
                possible_polygons = [self.green_polygons[i] for i in polygon_index.query(buffered_edge)]
                # Calculate the intersection length
                for polygon in possible_polygons:
                    
                    intersection = buffered_edge.intersection(polygon)
                    if intersection.is_valid and not intersection.is_empty:
                        if isinstance(intersection, (LineString, Polygon)):
                            intersection_length += intersection.length

            # Calculate the green index
            green_index = intersection_length / route_length

            # Update the best route if the current route has a higher index
            if green_index > max_index:
                max_index = green_index
                best_route = route

        return best_route

            
    def pairwise(self,iterable):
        """Return successive pairs from the input iterable.
        For example, pairwise([1, 2, 3, 4]) -> (1, 2), (2, 3), (3, 4)
        """
        a, b = tee(iterable)
        next(b, None)
        return zip(a, b)

    def get_diverse_paths(self,start, end, k):
        """
        Generate k diverse paths by iteratively removing edges after finding each shortest path.
        
        Parameters:
        - G: The graph containing nodes and edges.
        - start: The ID of the starting node.
        - end: The ID of the ending node.
        - k: The number of diverse paths to find.
        
        Returns:
        - A list of k diverse paths, each a list of node IDs.
        """
        graph=self.G
        # This function tries to return k diverse paths by modifying the edge removal strategy
        paths = []
        for _ in range(k):
            if nx.has_path(self.G,start,end):
                path = nx.shortest_path(self.G, source=start, target=end, weight='length')
                if path:
                    paths.append(path)
                    print('path: ')
                    print(path)
            
                    # Remove the edges from the graph to allow for diversity in the next iteration
                    for u, v in self.pairwise(path):
                        if self.G.has_edge(u, v):
                            G.remove_edge(u, v)
        return paths

    #function to print the routes i choose from when picking the greenest one
    #usually displays the 3 shortest routes to destination
    def get_colored_routes():
        """
        Calculate k diverse paths between the user's location and destination, and return them as a GeoJSON object.
        
        The function finds the shortest paths using OSMnx, colors each path, and returns the routes in GeoJSON format.
        
        Returns:
        - A GeoJSON feature collection containing colored paths.
        """
        data = request.json
        user_location = data.get('userLocation')
        destination = data.get('destination')
        k=20

        G = ox.graph_from_place("Cluj-Napoca, Romania", network_type="walk")
    
        G = nx.DiGraph(G)

        # Find the nearest nodes to user location and destination
        start_node = ox.distance.nearest_nodes(G, X=user_location['lng'], Y=user_location['lat'])
        end_node = ox.distance.nearest_nodes(G, X=destination['lng'], Y=destination['lat'])

        # Get k shortest simple paths
        #routes = list(islice(nx.shortest_simple_paths(G, start_node, end_node, weight="length"), k))
        routes = get_diverse_paths(G, start_node, end_node, k)

        colors = [
            "#FF0000",  # Red
            "#0000FF",  # Blue
            "#FFFF00",  # Yellow
            "#FF00FF",  # Magenta
            "#00FFFF",  # Cyan
            "#FFA500",  # Orange
            "#800080"   # Purple
        ]
        # Loop through and repeat colors if there are more routes than colors
        route_colors = (colors * ((k // len(colors)) + 1))[:k]

        # Prepare GeoJSON features for all paths
        features = []
        for path_index, (route,color) in enumerate(zip(routes,route_colors)):
            for u, v in pairwise(route):  
                # Extract properties (if they exist) and add defaults
                print('path index')
                print(path_index)
                properties = {
                    "path_index": path_index + 1,  # Index of the path
                    "color":color,
                    "u": u,
                    "v": v
                }

                # Get the geometry (coordinates)
                coordinates = [
                    [G.nodes[u]["x"], G.nodes[u]["y"]],
                    [G.nodes[v]["x"], G.nodes[v]["y"]]
                ]

                # Add feature
                features.append({
                    "type": "Feature",
                    "properties": properties,
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coordinates
                    }
                })

        # Construct GeoJSON
        geojson_data = {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {
                    "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                }
            },
            "features": features
        }
        return jsonify(geojson_data) 

if __name__ == '__main__':
    app = Flask(__name__)
    CORS(app)

    print('generating graph')
    G = ox.graph_from_place("Cluj-Napoca, Romania", network_type="walk")
    G = nx.DiGraph(G)
    print('graph generated')

    db_config = {
        "host": "localhost",
        "port": "5432",
        "database": "walk_safe",
        "user": "postgres",
        "password": "semiluna123"
    }
    accidentRouteFinder = AccidentAwareRouteFinder(G,db_config)
    greenRouteFinder = GreenRouteFinder(G,db_config)

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/get_greenest_path', methods=['POST'])
    def get_greenest_route():
        return greenRouteFinder.find_route()
    
    @app.route('/get_safest_path',methods=['POST'])
    def get_safest_route():
        return accidentRouteFinder.find_route()

    #app.register_blueprint(greenRouteFinder.blueprint, url_prefix='/get_greenest_path',methods=['POST'])

    app.run(debug=True,port=5501)
