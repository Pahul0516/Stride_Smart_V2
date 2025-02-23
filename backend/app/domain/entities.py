import osmnx as ox
from shapely.geometry import LineString, Point
from rasterio.mask import mask
import numpy as np
import rasterio
import io
import random
from shapely import wkb
import psycopg2
from psycopg2 import OperationalError


class CustomGraph:
    
    def __init__(self):
        print('generating graph')
        self.G = ox.graph_from_place("Cluj-Napoca, Romania", network_type="walk")
        print('graph generated')
        self.host = "localhost"
        self.dbname = "Maps_DB"
        self.ser = "postgres"
        self.password = "Qwertyuiop12"
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
                self.green_raster(cursor)
                self.accident_frequency(cursor)
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