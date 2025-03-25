import datetime
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
from app.repositories.AirQualityRepo import AirQualityRepo

class CustomGraph:
    
    def __init__(self):
        print('generating graph')
        self.G = ox.graph_from_place("Cluj-Napoca, Romania", network_type="walk")
        print('graph generated')
        self.host = "localhost"
        self.dbname = "walk_safe_4"
        self.user = "postgres"
        self.password = "semiluna123"
        self.init_graph_dictionary()
        self.connection()
        print('connection established')

    def init_graph_dictionary(self):
        for u, v, key, data in self.G.edges(keys=True, data=True):
            data['accident_frequency'] = 0
            data['green_index'] = 0
            data['air mark']=0
            data['accessibility']=0
            data['thermal_comfort']=0
        
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
            data['accident_frequency'] = 1

    def calculate_accessibility_index(self, edge, raster_src):
        """
        Calculate the accessibility index for an edge in the graph using raster data.
        If pixel intensity > 150, the area is marked as unaccessible (1), otherwise accessible (0).
        """
        buffer_distance = 0.000020  # Define a buffer zone around the edge
        u, v, edge_data = edge
        
        # Get the geometry of the edge
        if 'geometry' in edge_data:
            edge_geometry = edge_data['geometry']
        else:
            u_coords = self.G.nodes[u]['x'], self.G.nodes[u]['y']
            v_coords = self.G.nodes[v]['x'], self.G.nodes[v]['y']
            edge_geometry = LineString([u_coords, v_coords])
        
        # Create a buffer around the edge
        try:
            edge_buffer = edge_geometry.buffer(buffer_distance)
        except Exception as e:
            print(e)
            return None

        if not edge_buffer.is_valid or edge_buffer.is_empty:
            return None

        # Extract raster data within the buffer
        shapes = [edge_buffer.__geo_interface__]  
        out_image, out_transform = mask(raster_src, shapes, crop=True)
        out_image = out_image.flatten()  # Convert to 1D array of pixel values

        # Define accessibility threshold
        inaccessible_threshold = 138  # If pixel intensity > 150, it's unaccessible
        print('out image:',out_image)
        inaccessible_pixels = np.sum(out_image > inaccessible_threshold)
        #print('inaccessbile pixels:',inaccessible_pixels)
        #total_pixels = out_image.size
        #print('total pixels:',total_pixels)

        if(inaccessible_pixels>0):
            accessibility=1
        else:
            accessibility=0

        return accessibility
    
    def accessibility_raster(self, cursor):
        """Fetches an accessibility raster and updates the graph edges with accessibility values."""
        table_name = "accessible_raster"  # Change to the correct table name
        raster_column = "raster_map"
        raster_id = 2  # Change ID if needed
        
        # Query to fetch raster
        sql = f"SELECT ST_AsTIFF({raster_column}) FROM {table_name} WHERE id_harta = %s"
        cursor.execute(sql, (raster_id,))
        raster_data = cursor.fetchone()

        # Convert raster to bytes
        if raster_data and raster_data[0]:
            raster_bytes = io.BytesIO(raster_data[0])
        else:
            raster_bytes = None

        if raster_bytes:
            # Open the raster with rasterio
            with rasterio.open(raster_bytes) as src:
                i = 0
                for edge in self.G.edges(data=True):
                    i += 1
                    accessibility = self.calculate_accessibility_index(edge, src)
                    u, v, data = edge
                    #pixel_values=self.extract_pixel_values_for_line_traversal(LineString(edge),src)
                    #pixel_intensity=self.extract_pixel_intensities_for_line(LineString(edge),src)
                    data['accessibility'] = accessibility
                    print(f"edge {i} {accessibility}")
        else:
            print("Failed to fetch accessibility raster from the database.")


    def extract_pixel_intensities_for_line(line, raster_src):
        """
        Extract the pixel intensities that the LineString (graph edge) traverses in the raster.
        
        Parameters:
            line: A LineString representing the edge (from graph).
            raster_src: The rasterio dataset object for the raster file.
        
        Returns:
            pixel_values: List of pixel intensities that the line traverses.
        """
        try:
            # Get the affine transformation from raster coordinates (row, col) to geospatial coordinates (lon, lat)
            transform = raster_src.transform
            
            # List to store the pixel intensities
            pixel_values = []
            
            # Loop through each point in the LineString to get the raster pixel coordinates it intersects
            for point in line.coords:
                lon, lat = point  # Unpack the longitude and latitude
                
                # Convert geospatial coordinates (lon, lat) to pixel coordinates (row, col)
                col, row = ~transform * (lon, lat)  # Inverse of affine transform to get pixel (col, row)
                
                # Ensure the row and col are within the bounds of the raster
                if 0 <= row < raster_src.height and 0 <= col < raster_src.width:
                    row = int(row)
                    col = int(col)
                    
                    # Read the pixel value at this row, col
                    pixel_value = raster_src.read(1)[row, col]  # Read the first band (grayscale image)
                    pixel_values.append(pixel_value)
            
            # Return the list of pixel values (intensities)
            return pixel_values
        except Exception as e:
            print(f"An error occurred while extracting pixel intensities: {e}")
            return []

    def extract_pixel_values_for_line_traversal(line, raster_src):
        try:
            """
            Extract pixel values for the exact pixels that the line traverses using Bresenham’s line algorithm
            or direct pixel interpolation.
            
            Parameters:
                line: A LineString geometry (the edge).
                raster_src: A rasterio dataset object for the raster file.
            
            Returns:
                pixel_values: List of pixel values that the line traverses.
            """

            pixel_values = []
            
            # Iterate through each pair of points in the LineString using rasterio's sample method
            for coord in line.coords:
                lon, lat = coord
                # Convert the point's lon, lat to pixel coordinates
                col, row = ~raster_src.transform * (lon, lat)
                
                # Ensure the coordinates are within bounds
                if 0 <= row < raster_src.height and 0 <= col < raster_src.width:
                    row = int(row)
                    col = int(col)
                    
                    # Read the pixel value from the raster
                    pixel_value = raster_src.read(1)[row, col]  # Read first band (adjust if multiple bands)
                    pixel_values.append(pixel_value)
            
            return pixel_values
        except Exception as e:
            print(f"An error occurred while extracting pixel values: {e}")
            return []
    
    def get_fitting_raster(self):
        current_time = datetime.datetime.now()
        if current_time.month>=3 and current_time.month<=5:
            if current_time.hour>=8 and current_time.hour<12:
                return 1
            elif current_time.hour>=12 and current_time.hour<16:
                return 2
            else:
                return 3
        elif current_time.month>=6 and current_time.month<=8:
            if current_time.hour>=7 and current_time.hour<13:
                return 4
            elif current_time.hour>=13 and current_time.hour<17:
                return 5
            else:
                return 6
        elif current_time.month>=9 and current_time.month<=11:
            if current_time.hour>=8 and current_time.hour<12:
                return 7
            elif current_time.hour>=12 and current_time.hour<16:
                return 8
            else:
                return 9
        else:
            if current_time.hour>=7 and current_time.hour<12:
                return 10
            elif current_time.hour>=12 and current_time.hour<15:
                return 11
            else:
                return 12
            
    def get_thermal_value_for_pixel(self,pixel_value):
        if pixel_value==146:
            return 1
        elif pixel_value==188:
            return 2
        elif pixel_value==255:
            return 3
        elif pixel_value==165:
            return 4
        return 5

    def calculate_thermal_index(self, edge, src):
        """
        Computes the average thermal comfort value along an edge by sampling raster pixel values.
        :param edge: A tuple (u, v, data) where data contains geometry.
        :param src: Rasterio dataset opened from the raster map.
        :return: Average thermal comfort index.
        """
        """
        Calculate the green index for an edge in the graph using raster data,
        considering the exact geometry of the edge.
        """

        buffer_distance = 0.000010
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
        pixel_values = []
        for i in range(11):
            point = edge_geometry.interpolate(i / 10, normalized=True)
            x, y = point.x, point.y
            row, col = src.index(x, y)  # Convert coordinates to raster indices
            try:
                pixel_value = src.read(1)[row, col]  # Read pixel value
                pixel_values.append(self.get_thermal_value_for_pixel(pixel_value))
            except IndexError:
                continue  # Ignore points outside the raster
        
        return sum(pixel_values) / len(pixel_values) if pixel_values else 0
            
        
    def thermal_comfort_raster(self, cursor):
        """Fetches an accessibility raster and updates the graph edges with accessibility values."""
        table_name = "thermal_comfort_rasters"  # Change to the correct table name
        raster_column = "raster_map"
        raster_id = self.get_fitting_raster()
        
        # Query to fetch raster
        sql = f"SELECT ST_AsTIFF({raster_column}) FROM {table_name} WHERE id_harta = %s"
        cursor.execute(sql, (raster_id,))
        raster_data = cursor.fetchone()

        # Convert raster to bytes
        if raster_data and raster_data[0]:
            raster_bytes = io.BytesIO(raster_data[0])
        else:
            raster_bytes = None

        if raster_bytes:
            # Open the raster with rasterio
            with rasterio.open(raster_bytes) as src:
                i = 0
                for edge in self.G.edges(data=True):
                    i += 1
                    index = self.calculate_thermal_index(edge, src)
                    u, v, data = edge
                    print('index: ',index)

                    data['thermal_comfort'] = index
                    print(f"edge {i} {index}")
        else:
            print("Failed to fetch accessibility raster from the database.")

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
            #atribuim valoarea tuturor edge urilor dintr o arie -> 50m
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
    
    def set_air_quality(self,cursor):
        return None


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
                #self.accessibility_raster(cursor)
                #self.accident_frequency(cursor)
                #self.get_tourist_points(cursor)
                #self.thermal_comfort_raster(cursor)
                for edge in self.G.edges(data=True):
                    u,v,data=edge
                    print('DATA: ',data['air_mark'])

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