from itertools import pairwise
import random
import time
import matplotlib.pyplot as plt
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
from aco import AntColony

class Information:
    print('generating graph')
    G = ox.graph_from_place("Cluj-Napoca, Romania", network_type="walk")
    print('graph generated')

    host = "localhost"
    dbname = "walk_safe_3"
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

        import random

    def set_air_marks(self, cursor):
        query = "SELECT osm_id, centroid_x, centroid_y, air_mark FROM air_marks;"  # Adjust table and column names as needed
        cursor.execute(query)
        results = cursor.fetchall()
        
        i = 1
        for row in results:
            print(i)
            i += 1
            centroid_x = row[1]
            centroid_y = row[2]
            air_quality = row[3]
            print('coordinates:',centroid_x,centroid_y)
            print('air quality',air_quality)
            # Find the nearest edge to the centroid coordinates
            point = Point(centroid_x, centroid_y)
            edge = self.closest_edge_to_point(point)
            
            if edge:
                u, v, data = edge  # Unpack edge tuple
                data['air_mark'] = air_quality  # Assign air quality mark to the edge data
                print('air mark:')
                print(air_quality)

        # If needed, apply the air quality mark to all edges (in case of missing data)
        i = 1
        for u, v, data in self.G.edges(data=True):
            print(i)
            i += 1
            # You can assign a default air quality value or something random if no specific data is available
            if 'air_mark' not in data:
                data['air_mark'] = 0  # Example of assigning a random air quality mark

    def get_tourist_points(self, cursor):
        query = "select category, geom from tourists"
        tourists_points = {}
        cursor.execute(query)
        results = cursor.fetchall()
        for row in results:
            category = row[0]
            geom_wkb = row[1]
            geom = wkb.loads(geom_wkb)
            closest_node = ox.distance.nearest_nodes(self.G, X=geom.x, Y=geom.y)
            if category not in tourists_points:
                tourists_points[category] = []
            tourists_points[category].append(closest_node) 

        self.G.graph["tourists_points"] = tourists_points

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
                #self.green_raster(cursor)
                #self.accident_frequency(cursor)
                self.accesibility_zone(cursor)
                self.get_tourist_points(cursor)
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
    custom_graph=None
    start_node = None
    goal_node = None
    alpha = 0.5
    beta = 0.5

    def __init__(self, G,custom_graph):
        self.G = G
        self.custom_graph=custom_graph

    def set_alpha(self, alpha):
        self.alpha = alpha

    def set_beta(self, beta):
        self.beta = beta

    def custom_cost(self, u, v, data):
        try:
            print('trying')
            # Get 'length' from the OSMnx graph
            length = data[0].get('length', float('inf'))

            # Retrieve 'AirQuality' from the custom graph
            # Assuming `self.custom_graph` is your custom graph
            if self.custom_graph.has_edge(u, v):
                air_quality = float(self.custom_graph[u][v].get('AirQuality', 0.0))  # Default to 4.0 if missing
                print('yes')
            else:
                air_quality = 0.0  # Penalize if no edge exists in the custom graph
                print('no')

            # Normalize the values
            L = (length - 0.24) / (3201.74 - 0.24)
            A = (air_quality - 0.0) / (4.0 - 0.0)

            # Weighted cost
            W = self.alpha * L + self.beta * A

            # Debugging: Ensure W is real
            if isinstance(W, complex):
                raise ValueError(f"Complex cost encountered: W={W}, length={length}, air_quality={air_quality}")
            print('(',L,A,W,')')
            return W

        except Exception as e:
            print(f"Error in custom_cost for edge ({u}, {v}): {e}")
            raise

    def heuristic(self, u, v):
        (x1, y1) = G.nodes[u]['x'], G.nodes[u]['y']
        (x2, y2) = G.nodes[v]['x'], G.nodes[v]['y']
        return ((x2 - x1) * 2 + (y2 - y1) * 2) ** 0.5  # Euclidean distance
    def get_path(self,start_coords,goal_coords,alpha = 0.5, beta = 0.5):
        print('getting path...')
        self.set_alpha(alpha)
        self.set_beta(beta)
        # Find the nearest nodes to the start and goal coordinates
        self.start_node = ox.distance.nearest_nodes(G, X=start_coords['lng'], Y=start_coords['lat'])  # X is longitude, Y is latitude
        self.goal_node = ox.distance.nearest_nodes(G, X=goal_coords['lng'], Y=goal_coords['lat'])
        print('going into a star...')
        self.path = nx.astar_path(G, source=self.start_node, target=self.goal_node, weight=self.custom_cost, heuristic=self.heuristic)
        return self.path
    def display_air_quality_data(self,graph):
        # Iterate over all edges in the graph
        for u, v, data in graph.edges(data=True):
            # Check if the 'AirQuality' attribute exists in the edge data
            if 'AirQuality' in data:
                air_quality = data['AirQuality']
                print(f"Edge ({u}, {v}) has AirQuality: {air_quality}")
            else:
                print(f"Edge ({u}, {v}) does not have AirQuality data.")
class ThermalComfort:
    G = None
    path = None
    custom_graph=None
    start_node = None
    goal_node = None
    alpha = 0.5
    beta = 0.5

    def __init__(self, G,custom_graph):
        self.G = G
        self.custom_graph=custom_graph

    def set_alpha(self, alpha):
        self.alpha = alpha

    def set_beta(self, beta):
        self.beta = beta

    def custom_cost(self, u, v, data):
        try:
            print('trying')
            # Get 'length' from the OSMnx graph
            length = data[0].get('length', float('inf'))

            # Retrieve 'ComfortIndex' from the custom graph
            # Assuming `self.custom_graph` is your custom graph
            if self.custom_graph.has_edge(u, v):
                comfort_index = float(self.custom_graph[u][v].get('comfort_index', 0.0))  # Default to 0.0 if missing
                print('yes')
            else:
                comfort_index = 0.0  # Penalize if no edge exists in the custom graph
                print('no')

            # Normalize the values
            L = (length - 0.24) / (3201.74 - 0.24)
            A = 1-comfort_index

            # Weighted cost
            W = self.alpha * L + self.beta * A

            print('(',L,A,W,')')
            return W

        except Exception as e:
            print(f"Error in custom_cost for edge ({u}, {v}): {e}")
            raise

    def heuristic(self, u, v):
        (x1, y1) = G.nodes[u]['x'], G.nodes[u]['y']
        (x2, y2) = G.nodes[v]['x'], G.nodes[v]['y']
        return ((x2 - x1) * 2 + (y2 - y1) * 2) ** 0.5  # Euclidean distance
    def get_path(self,start_coords,goal_coords,alpha = 0.5, beta = 0.5):
        print('getting path...')
        self.set_alpha(alpha)
        self.set_beta(beta)
        # Find the nearest nodes to the start and goal coordinates
        self.start_node = ox.distance.nearest_nodes(G, X=start_coords['lng'], Y=start_coords['lat'])  # X is longitude, Y is latitude
        self.goal_node = ox.distance.nearest_nodes(G, X=goal_coords['lng'], Y=goal_coords['lat'])
        print('going into a star...')
        self.path = nx.astar_path(G, source=self.start_node, target=self.goal_node, weight=self.custom_cost, heuristic=self.heuristic)
        return self.path
    def display_thermal_comfort_data(self,graph):
        # Iterate over all edges in the graph
        for u, v, data in graph.edges(data=True):
            # Check if the 'comfort_index' attribute exists in the edge data
            if 'comfort_index' in data:
                comfort_index = data['comfort_index']
                print(f"Edge ({u}, {v}) has comfort index: {comfort_index}")
            else:
                print(f"Edge ({u}, {v}) does not have comfort index data.")

class TouristPath:
    G = None
    start_node = None
    filter = []
    path = None
    map = {}

    def __init__(self, G, filter):
        self.G = G
        self.filter = filter

    def set_filter(self,filter):
        self.filter=filter

    def mapping(self, start_node):
        self.map[0] = start_node
        i = 1
        criteria = ''
        for criteria in self.filter:
            for point in self.G.graph['tourists_points'][criteria]:
                self.map[i] = point
                i += 1
            
    def create_matirx(self):
        distance_matrix = np.zeros((len(self.map), len(self.map)))
        for i, source in enumerate(self.map.values()):
            for j, target in enumerate(self.map.values()):
                if i == j:
                    distance_matrix[i][j] = np.inf
                else:
                    distance_matrix[i][j] = nx.shortest_path_length(
                        G, source, target, weight='length'
                    )   
                    if distance_matrix[i][j]==0:
                        distance_matrix[i][j]=9999999
        return distance_matrix

    def get_points(self, mat):
        ant_colony = AntColony(mat, 10, 1, 200, 0.95, alpha=1, beta=2)
        shortest_path = ant_colony.run()
        points_list = []
        for point in shortest_path[0]:
            points_list.append(point[0])
        return points_list

    def get_path(self,start_coords):
        self.start_node = ox.distance.nearest_nodes(G, X=start_coords['lng'], Y=start_coords['lat']) 
        self.mapping(self.start_node)
        list_of_points = self.get_points(self.create_matirx())
        concatenated_path = []
    
        for i in range(len(list_of_points) - 1):
            current_node = self.map[list_of_points[i]]
            next_node = self.map[list_of_points[i + 1]]
                
            path_segment = nx.shortest_path(G, source=current_node, target=next_node, weight='length')
                
            if concatenated_path:
                concatenated_path.extend(path_segment[1:])  
            else:
                concatenated_path.extend(path_segment)  
        self.path = concatenated_path
        return self.path
    
    def show(self):
        fig, ax = ox.plot_graph_route(G, self.path, route_linewidth=3, node_size=0, bgcolor='white', show=False, close=False)
        start_coords = (self.G.nodes[self.start_node]['x'], self.G.nodes[self.start_node]['y'])  # (longitude, latitude)
        ax.scatter(*start_coords, color='green', s=100, label='Start')  # Start marker
        ax.legend()
        plt.show()

class CombinedCriteriaPath:
    G = None
    path = None
    custom_graph=None
    start_node = None
    goal_node = None
    alpha = 0.5
    beta = 0.5
    is_thermal_comfort=0
    is_green=0
    is_safe=0
    is_accessible=0
    is_air_quality=0

    def __init__(self, G,custom_graph=None,is_thermal_comfort=0,is_air_quality=0,is_green=0,is_safe=0,is_accessible=0):
        self.G = G
        self.custom_graph=custom_graph
        self.is_thermal_comfort=is_thermal_comfort
        self.is_air_quality=is_air_quality
        self.is_green=is_green
        self.is_safe=is_safe
        self.is_accessible=is_accessible

    def set_alpha(self, alpha):
        self.alpha = alpha

    def set_beta(self, beta):
        self.beta = beta

    def custom_cost(self, u, v, data):
        try:
            print('trying')
            # Get 'length' from the OSMnx graph
            length = data[0].get('length', float('inf'))

            #get wanted attributes
            comfort_index,air_index,green_index,safe_index=0,0,0,0
            if self.is_thermal_comfort==1:
                if self.custom_graph.has_edge(u, v):
                    comfort_index = float(self.custom_graph[u][v].get('comfort_index', 0.0))  # Default to 0.0 if missing
                    comfort_index=1-comfort_index
                else:
                    comfort_index = 0.0  # Penalize if no edge exists in the custom graph
                #normalize: 
                
            if self.is_air_quality==1:
                if self.custom_graph.has_edge(u, v):
                    air_index = float(self.custom_graph[u][v].get('AirQuality', 0.0))  # Default to 0.0 if missing
                else:
                    air_index = 0.0  # Penalize if no edge exists in the custom graph
                #normalize: 
                air_index = (air_index - 0.0) / (4.0 - 0.0)
            if self.is_green==1:
                green_index = data[0].get('green_index', 0)
                green_index=(green_index - 0.0) / (90 - 0.0)
                green_index=1-green_index
            if self.is_safe==1:
                safe_index = data[0].get('accident_frequency', 0)
                safe_index = (safe_index - 0) / (3 - 0)
            
            A = self.is_thermal_comfort*comfort_index+ self.is_air_quality*air_index + self.is_green*green_index + self.is_safe*safe_index
            L = (length - 0.24) / (3201.74 - 0.24)
            W = self.alpha * L + self.beta * A
            
            #the average of indexes has been computed. but if the point is unaccessible, we wont take it into consideration:
            if self.is_accessible==1:
                accessibility = True
                point_u = Point(G.nodes[u]['x'], G.nodes[u]['y'])
                point_v = Point(G.nodes[v]['x'], G.nodes[v]['y'])
                for polygon in G.graph['non_accessible_polygons']:
                    if polygon.contains(point_u) or polygon.contains(point_v):
                        accessibility = False
                if accessibility==False:
                    W =  length + 99999999
            return W

        except Exception as e:
            print(f"Error in custom_cost for edge ({u}, {v}): {e}")
            raise

    def heuristic(self, u, v):
        (x1, y1) = G.nodes[u]['x'], G.nodes[u]['y']
        (x2, y2) = G.nodes[v]['x'], G.nodes[v]['y']
        return ((x2 - x1) * 2 + (y2 - y1) * 2) ** 0.5  # Euclidean distance
    def get_path(self,start_coords,goal_coords,alpha = 0.5, beta = 0.5):
        print('getting path...')
        self.set_alpha(alpha)
        self.set_beta(beta)
        # Find the nearest nodes to the start and goal coordinates
        self.start_node = ox.distance.nearest_nodes(G, X=start_coords['lng'], Y=start_coords['lat'])  # X is longitude, Y is latitude
        self.goal_node = ox.distance.nearest_nodes(G, X=goal_coords['lng'], Y=goal_coords['lat'])
        print('going into a star...')
        self.path = nx.astar_path(G, source=self.start_node, target=self.goal_node, weight=self.custom_cost, heuristic=self.heuristic)
        return self.path

if __name__ == '__main__':
    app = Flask(__name__)
    CORS(app)

    information = Information()
    G = information.get_graph()
    safetyPath = SaftyPath(G)
    greenPath = GreenPath(G)
    accessibilityPath = AccessibilityPath(G)
    print('loading air graph...')
    air_graph = ox.load_graphml("static/data/city_with_air_quality.graphml")
    airQualityPath=AirQualityPath(G,air_graph)
    print('done!')
    combinedCriteriaPath=CombinedCriteriaPath(G,air_graph)
    thermal_comfort_graph=ox.load_graphml("static/data/graph_with_comfort_index.graphml")
    thermalComfort=ThermalComfort(G,thermal_comfort_graph)

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/get_greenest_path', methods=['POST'])
    def get_greenest_route():
        data = request.json
        start_coords = data.get('userLocation')
        goal_coords = data.get('destination')
        if goal_coords==None:
            return jsonify({'error': 'No destination provided'}), 400
        else:
            print('start location: ')
            print(start_coords)
            print('end locaton: ')
            print(goal_coords)
            path = greenPath.get_path(start_coords,goal_coords,alpha = 0.5, beta = 0.5)
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
        if goal_coords==None:
            return jsonify({'error': 'No destination provided'}), 400
        else:
            path = safetyPath.get_path(start_coords,goal_coords,alpha = 0.5, beta = 0.5)
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
            print('donee')
                # Return GeoJSON as a response
            return jsonify(geojson_data)

    @app.route('/get_air_quality_path', methods=['POST'])
    def get_air_quality_route():
        data = request.json
        start_coords = data.get('userLocation')
        goal_coords = data.get('destination')
        if goal_coords==0:
            return jsonify({'error': 'No destination provided'}), 400
        else:
            path = airQualityPath.get_path(start_coords,goal_coords,alpha = 0.5, beta = 0.5)
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
    
    @app.route('/get_thermal_comfort_path',methods=['POST'])
    def get_thermal_comfort_route():
        data = request.json
        start_coords = data.get('userLocation')
        goal_coords = data.get('destination')
        if goal_coords==0:
            return jsonify({'error': 'No destination provided'}), 400
        else:
            path = thermalComfort.get_path(start_coords,goal_coords,alpha = 0.5, beta = 0.5)
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

    @app.route('/get_combined_path',methods=['POST'])
    def get_combined_route():
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
            print('donee')
                # Return GeoJSON as a response
            return jsonify(geojson_data)

    @app.route('/get_tourist_path',methods=['POST'])
    def get_tourist_route():
        data = request.json
        is_landmark=data.get('is_landmark')
        is_museum=data.get('is_museum')
        is_caffe=data.get('is_caffe')
        is_restaurant=data.get('is_restaurant')
        is_entertainment=data.get('is_entertainment')
        start_coords = data.get('userLocation')

        features=[]
        if is_landmark==1: 
            features.append('landmark')
        if is_museum==1: 
            features.append('museum')
        if is_caffe==1: 
            features.append('caffe')
        if is_restaurant==1: 
            features.append('restaurant')
        if is_entertainment==1:
            features.append('entertainment')

        print('features: ',features)
        touristPath=TouristPath(G,features)
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
        print('donee')
                # Return GeoJSON as a response
        return jsonify(geojson_data)

    app.run(debug=False,port=5501)

