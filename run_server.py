from itertools import pairwise
import random
import time

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import osmnx as ox
import networkx as nx
import matplotlib.pyplot as plt
import rasterio
from shapely.geometry import LineString
import psycopg2
import io
import numpy as np
from rasterio.mask import mask
from psycopg2 import OperationalError
from shapely import wkb
from shapely.geometry import Point


class Information:
    print('generating graph')
    G = ox.graph_from_place("Cluj-Napoca, Romania", network_type="walk")
    print('graph generated')

    host = "localhost"
    dbname = "walk_safe_2"
    user = "postgres"
    password = "semiluna123"

    def __init__(self):
        self.init_graph_dictionary()
        self.connection()
    def init_graph_dictionary(self):
        for u, v, key, data in self.G.edges(keys=True, data=True):
            data['accident_frequency'] = 0
            data['green_index'] = 0
            data['air mark']=0
    def get_graph(self):
        return self.G

    def calculate_green_index(self, edge, raster_src):
        """
        Calculate the green index for an edge in the graph using raster data,
        considering the exact geometry of the edge.
        """

        buffer_distance = 0.000090
        u, v, edge_data = edge
        if 'geometry' in edge_data:
            edge_geometry = edge_data['geometry']
        else:
            u_coords = self.G.nodes[u]['x'], self.G.nodes[u]['y']
            v_coords = self.G.nodes[v]['x'], self.G.nodes[v]['y']
            edge_geometry = LineString([u_coords, v_coords])
        try:
            edge_buffer = edge_geometry.buffer(buffer_distance)
        except Exception as e:
            print(e)
        if not edge_buffer.is_valid or edge_buffer.is_empty:
            return None
        shapes = [edge_buffer.__geo_interface__]
        out_image, out_transform = mask(raster_src, shapes, crop=True)
        out_image = out_image.flatten()
        green_threshold = 0  # Example threshold for "green" pixels
        green_pixels = np.sum(out_image > green_threshold)
        total_pixels = out_image.size
        if total_pixels == 0:
            return 1
        green_index = green_pixels / total_pixels * 100
        return green_index
    
    def green_raster(self, cursor):
        table_name = "harta"
        raster_column = "raster_map"
        raster_id = 1  # Example raster ID
        sql = f"SELECT ST_AsTIFF({raster_column}) FROM {table_name} WHERE id_harta = %s"
        cursor.execute(sql, (raster_id,))
        raster_data = cursor.fetchone()

        if raster_data and raster_data[0]:
            raster_bytes = io.BytesIO(raster_data[0])
        else:
            raster_bytes = None

        if raster_bytes:
            # Open the raster with rasterio
            with rasterio.open(raster_bytes) as src:
                i = 0
                for edge in self.G.edges(data=True):
                    print(i)
                    i+=1
                    green_index = self.calculate_green_index(edge, src)
                    u, v, data = edge
                    data['green_index'] = green_index
        else:
            print("Failed to fetch raster data from the database.")

    def convertor(self, WKB_str):
        wkb_string = bytes.fromhex(WKB_str)
        point = wkb.loads(wkb_string)
        longitude, latitude = point.x, point.y
        return point
    def closest_edge_to_point(self, point):
        min_dist = float('inf')
        closest_edge = None
        for u, v, data in self.G.edges(data=True):
            if 'geometry' in data:
                edge_line = data['geometry']
            else:
                u_coords = self.G.nodes[u]['x'], self.G.nodes[u]['y']
                v_coords = self.G.nodes[v]['x'], self.G.nodes[v]['y']
                edge_line = LineString([u_coords, v_coords])

            #edge_line = LineString([u_coords, v_coords])
            dist = point.distance(edge_line)
            if dist < min_dist:
                min_dist = dist
                closest_edge = (u, v, data)
        return closest_edge

    def accident_frequency(self, cursor):
        query = "SELECT id_accident, grad, coordonate FROM accident;"
        cursor.execute(query)
        results = cursor.fetchall()
        i=1
        for row in results:
            print(i)
            i+=1
            point = self.convertor(row[2])
            edge = self.closest_edge_to_point(point)
            if edge:
                u, v, data = edge  # Unpack edge tuple
                data['accident_frequency'] = row[1]
        i = 1
        for u, v, data in self.G.edges(data = True):
            print(i)
            i+=1
            data['accident_frequency'] = random.choice([0,1,2,3])

    def accesibility_zone(self, cursor):
        query = "select name, geom from accessibility"
        cursor.execute(query)
        results = cursor.fetchall()

        if 'accessible_polygons' not in self.G.graph:
            self.G.graph['accessible_polygons'] = []
        if 'non_accessible_polygons' not in self.G.graph:
            self.G.graph['non_accessible_polygons'] = []

        for row in results:
            name = row[0]
            geom_wkb = row[1]
            geom = wkb.loads(geom_wkb)
            if name == "Zona accesibila":
                self.G.graph['accessible_polygons'].append(geom)
            else:
                self.G.graph['non_accessible_polygons'].append(geom)

    def set_air_marks():
         query = "select name, geom from accessibility"

    def connection(self):
        retries = 10
        attempt = 0
        while attempt < retries:
            try:
                # Connect to the PostgreSQL database
                conn = psycopg2.connect(
                    host=self.host,
                    dbname=self.dbname,
                    user=self.user,
                    password=self.password
                )
                cursor = conn.cursor()


                self.green_raster(cursor)
                self.accident_frequency(cursor)
                self.accesibility_zone(cursor)
                break

            except OperationalError as e:
                attempt += 1
                print(f"Connection failed (attempt {attempt} of {retries}): {e}")
            except Exception as e:
                print(f"An error occurred while fetching raster: {e}")
                break
            finally:
                try:
                    if cursor:
                        cursor.close()
                    if conn:
                        conn.close()
                except:
                    pass

        return None

    def show(self):
        maxGI = -1
        minGI = 99999
        maxLen = -1
        minLen = 1000000
        for u, v, data in self.G.edges(data=True):
            green_index = data.get('green_index', 'N/A')
            accident_frequency = data.get('accident_frequency', 'N/A')
            print(f"Edge ({u} -> {v}): Green Index: {green_index}, Accident Frequency: {accident_frequency}")
            edge_length = data.get('length', 'N/A')
            if green_index > maxGI:
                maxGI = green_index
            if green_index < minGI:
                minGI = green_index
            if edge_length > maxLen:
                maxLen = edge_length
            if edge_length < minLen:
                minLen = edge_length

        print(str(maxGI) + " " + str(minGI) + " " + str(maxLen) + " " + str(minLen))


class SaftyPath:
    G = None
    path = None
    start_node = None
    goal_node = None
    alpha = 0.5
    beta = 0.5
    def __init__(self, G):
        self.G = G

    def set_alpha(self, alpha):
        self.alpha= alpha
    def set_beta(self, beta):
        self.beta = beta

    def custom_cost(self, u, v, data):
        length = data[0].get('length', float('inf'))  # Use a large value if length is missing

        accident_frequency = data[0].get('accident_frequency', 0)

        L = (length - 0.24) / (3201.74 - 0.24)
        A = (accident_frequency - 0) / (3 - 0)

        W = self.alpha * L + self.beta * A
        print(W)
        return W
    def heuristic(self, u, v):
        (x1, y1) = G.nodes[u]['x'], G.nodes[u]['y']
        (x2, y2) = G.nodes[v]['x'], G.nodes[v]['y']
        return ((x2 - x1) * 2 + (y2 - y1) * 2) ** 0.5  # Euclidean distance
    def get_path(self,start_coords,goal_coords,alpha = 0.5, beta = 0.5):
        self.set_alpha(alpha)
        self.set_beta(beta)
        # Find the nearest nodes to the start and goal coordinates
        self.start_node = ox.distance.nearest_nodes(G, X=start_coords['lng'], Y=start_coords['lat'])  # X is longitude, Y is latitude
        self.goal_node = ox.distance.nearest_nodes(G, X=goal_coords['lng'], Y=goal_coords['lat'])
        self.path = nx.astar_path(G, source=self.start_node, target=self.goal_node, weight=self.custom_cost, heuristic=self.heuristic)
        return self.path

    def show(self):
        fig, ax = ox.plot_graph_route(G, path, route_linewidth=3, node_size=0, bgcolor='white', show=False, close=False)
        start_coords = (self.G.nodes[self.start_node]['x'], self.G.nodes[self.start_node]['y'])  # (longitude, latitude)
        goal_coords = (self.G.nodes[self.goal_node]['x'], self.G.nodes[self.goal_node]['y'])  # (longitude, latitude)
        ax.scatter(*start_coords, color='green', s=100, label='Start')  # Start marker
        ax.scatter(*goal_coords, color='red', s=100, label='End')  # End marker
        ax.legend()
        plt.show()
class GreenPath:
    G = None
    path = None
    start_node = None
    goal_node = None
    alpha = 0.5
    beta = 0.5

    def __init__(self, G):
        self.G = G

    def set_alpha(self, alpha):
        self.alpha = alpha

    def set_beta(self, beta):
        self.beta = beta

    def custom_cost(self, u, v, data):
        length = data[0].get('length', float('inf'))
        green_index = data[0].get('green_index', 0)

        L = (length - 0.24) / (3201.74 - 0.24)
        G = (green_index - 0.0) / (90 - 0.0)

        W = self.alpha * L + self.beta * (1 - G)
        return W
    def heuristic(self, u, v):
        (x1, y1) = G.nodes[u]['x'], G.nodes[u]['y']
        (x2, y2) = G.nodes[v]['x'], G.nodes[v]['y']
        return ((x2 - x1) * 2 + (y2 - y1) * 2) ** 0.5  # Euclidean distance
    def get_path(self,start_coords,goal_coords,alpha = 0.5, beta = 0.5):
        self.set_alpha(alpha)
        self.set_beta(beta)
        # Find the nearest nodes to the start and goal coordinates
        self.start_node = ox.distance.nearest_nodes(G, X=start_coords['lng'], Y=start_coords['lat'])  # X is longitude, Y is latitude
        self.goal_node = ox.distance.nearest_nodes(G, X=goal_coords['lng'], Y=goal_coords['lat'])
        self.path = nx.astar_path(G, source=self.start_node, target=self.goal_node, weight=self.custom_cost, heuristic=self.heuristic)
        return self.path

    def show(self):
        fig, ax = ox.plot_graph_route(G, path, route_linewidth=3, node_size=0, bgcolor='white', show=False, close=False)
        start_coords = (self.G.nodes[self.start_node]['x'], self.G.nodes[self.start_node]['y'])  # (longitude, latitude)
        goal_coords = (self.G.nodes[self.goal_node]['x'], self.G.nodes[self.goal_node]['y'])  # (longitude, latitude)
        ax.scatter(*start_coords, color='green', s=100, label='Start')  # Start marker
        ax.scatter(*goal_coords, color='red', s=100, label='End')  # End marker
        ax.legend()
        plt.show()

class AccessibilityPath:
    G = None
    path = None
    start_node = None
    goal_node = None

    def __init__(self, G):
        self.G = G

    def custom_cost(self, u, v, data):
        length = data[0].get('length', float('inf'))
        accessibility = True
        point_u = Point(G.nodes[u]['x'], G.nodes[u]['y'])
        point_v = Point(G.nodes[v]['x'], G.nodes[v]['y'])
    
        for polygon in G.graph['non_accessible_polygons']:
            if polygon.contains(point_u) or polygon.contains(point_v):
                print("punct inaccesibil")
                accessibility = False
        
        if accessibility:
            W = length
        else:
            W =  length + 99999999
        return W
    def heuristic(self, u, v):
        (x1, y1) = G.nodes[u]['x'], G.nodes[u]['y']
        (x2, y2) = G.nodes[v]['x'], G.nodes[v]['y']
        return ((x2 - x1) * 2 + (y2 - y1) * 2) ** 0.5  # Euclidean distance
    def get_path(self,start_coords,goal_coords):
        self.start_node = ox.distance.nearest_nodes(G, X=start_coords['lng'], Y=start_coords['lat'])  # X is longitude, Y is latitude
        self.goal_node = ox.distance.nearest_nodes(G, X=goal_coords['lng'], Y=goal_coords['lat'])
        self.path = nx.astar_path(G, source=self.start_node, target=self.goal_node, weight=self.custom_cost, heuristic=self.heuristic)
        return self.path

    def show(self):
        fig, ax = ox.plot_graph_route(G, path, route_linewidth=3, node_size=0, bgcolor='white', show=False, close=False)
        start_coords = (self.G.nodes[self.start_node]['x'], self.G.nodes[self.start_node]['y'])  # (longitude, latitude)
        goal_coords = (self.G.nodes[self.goal_node]['x'], self.G.nodes[self.goal_node]['y'])  # (longitude, latitude)
        ax.scatter(*start_coords, color='green', s=100, label='Start')  # Start marker
        ax.scatter(*goal_coords, color='red', s=100, label='End')  # End marker
        ax.legend()
        plt.show()

class AirQualityPath:
    G = None
    path = None
    start_node = None
    goal_node = None
    alpha = 0.5
    beta = 0.5

    def __init__(self, G):
        self.G = G

    def set_alpha(self, alpha):
        self.alpha = alpha

    def set_beta(self, beta):
        self.beta = beta

    def custom_cost(self, u, v, data):
        length = data[0].get('length', float('inf'))
        green_index = data[0].get('green_index', 0)

        L = (length - 0.24) / (3201.74 - 0.24)
        G = (green_index - 0.0) / (90 - 0.0)

        W = self.alpha * L + self.beta * (1 - G)
        return W
    def heuristic(self, u, v):
        (x1, y1) = G.nodes[u]['x'], G.nodes[u]['y']
        (x2, y2) = G.nodes[v]['x'], G.nodes[v]['y']
        return ((x2 - x1) * 2 + (y2 - y1) * 2) ** 0.5  # Euclidean distance
    def get_path(self,start_coords,goal_coords,alpha = 0.5, beta = 0.5):
        self.set_alpha(alpha)
        self.set_beta(beta)
        # Find the nearest nodes to the start and goal coordinates
        self.start_node = ox.distance.nearest_nodes(G, X=start_coords['lng'], Y=start_coords['lat'])  # X is longitude, Y is latitude
        self.goal_node = ox.distance.nearest_nodes(G, X=goal_coords['lng'], Y=goal_coords['lat'])
        self.path = nx.astar_path(G, source=self.start_node, target=self.goal_node, weight=self.custom_cost, heuristic=self.heuristic)
        return self.path

    def show(self):
        fig, ax = ox.plot_graph_route(G, path, route_linewidth=3, node_size=0, bgcolor='white', show=False, close=False)
        start_coords = (self.G.nodes[self.start_node]['x'], self.G.nodes[self.start_node]['y'])  # (longitude, latitude)
        goal_coords = (self.G.nodes[self.goal_node]['x'], self.G.nodes[self.goal_node]['y'])  # (longitude, latitude)
        ax.scatter(*start_coords, color='green', s=100, label='Start')  # Start marker
        ax.scatter(*goal_coords, color='red', s=100, label='End')  # End marker
        ax.legend()
        plt.show()

if __name__ == '__main__':
    app = Flask(__name__)
    CORS(app)

    a = Information()
    G = a.get_graph()
    b = SaftyPath(G)
    c = GreenPath(G)
    d = AccessibilityPath(G)

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/get_greenest_path', methods=['POST'])
    def get_greenest_route():
        data = request.json
        start_coords = data.get('userLocation')
        goal_coords = data.get('destination')
        print('start location: ')
        print(start_coords)
        print('end locaton: ')
        print(goal_coords)
        path = c.get_path(start_coords,goal_coords,alpha = 0.5, beta = 0.5)
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
        print('donee')
            # Return GeoJSON as a response
        return jsonify(geojson_data)
    
    @app.route('/get_safest_path',methods=['POST'])
    def get_safest_route():
        data = request.json
        start_coords = data.get('userLocation')
        goal_coords = data.get('destination')
        path = b.get_path(start_coords,goal_coords,alpha = 0.5, beta = 0.5)
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
        print('donee')
            # Return GeoJSON as a response
        return jsonify(geojson_data)
    
    @app.route('/get_accessible_path', methods=['POST'])
    def get_accessible_route():
        data = request.json
        start_coords = data.get('userLocation')
        goal_coords = data.get('destination')
        path = d.get_path(start_coords,goal_coords)
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
        print('donee')
            # Return GeoJSON as a response
        return jsonify(geojson_data)

    #app.register_blueprint(greenRouteFinder.blueprint, url_prefix='/get_greenest_path',methods=['POST'])
    app.run(debug=False,port=5501)
