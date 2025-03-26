from pyproj import Transformer
import requests
import psycopg2
import time
from datetime import datetime, timezone

from shapely import LineString, Point

class AirQualityRepo:
    def __init__(self,G):
        self.G=G
        self.DB_CONFIG = {
            "dbname": "walk_safe_4",
            "user": "postgres",
            "password": "semiluna123",
            "host": "localhost",
            "port": "5432"
        }
        self.API_URL = "https://cluj-napoca.aqi.eco/en/data.json"

    def fetch_air_quality(self):
        response = requests.get(self.API_URL)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"API Error: {response.status_code}")
            return None

    def update_database(self,data):
        db=self.DB_CONFIG
        conn = psycopg2.connect(**db)
        cur = conn.cursor()

        for entry in data:
            try:
                if entry["average_1h"].get("index") is None:
                    print(f"Skipping station {entry.get('name', 'unknown')} due to null air quality index.")
                    continue

                station_name = entry["name"]
                lat, lng = float(entry["location"]["lat"]), float(entry["location"]["lng"])
                pm25 = entry["average_1h"]["pm25"]
                pm10 = entry["average_1h"]["pm10"]
                air_quality_index = entry["average_1h"]["index"]
                air_quality_index_num = entry["average_1h"]["index_num"]

                last_update_timestamp = datetime.fromtimestamp(
                    entry["last_data"].get("last_update", time.time()), timezone.utc
                )

                cur.execute("""
                    INSERT INTO air_quality (station_name, latitude, longitude, pm25, pm10, air_quality_index, air_quality_index_num, last_updated)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (station_name) DO UPDATE 
                    SET pm25 = EXCLUDED.pm25,
                        pm10 = EXCLUDED.pm10,
                        air_quality_index = EXCLUDED.air_quality_index,
                        air_quality_index_num = EXCLUDED.air_quality_index_num,
                        last_updated = EXCLUDED.last_updated;
                """, (station_name, lat, lng, pm25, pm10, air_quality_index, air_quality_index_num, last_update_timestamp))

            except KeyError as e:
                print(f"Skipping station {entry.get('name', 'unknown')} due to missing key: {e}")
            except Exception as e:
                print(f"Unexpected error with station {entry.get('name', 'unknown')}: {e}")

        conn.commit()
        cur.close()
        conn.close()
        print("Database updated successfully.")

    def set_air_marks(self):
        db=self.DB_CONFIG
        conn = psycopg2.connect(**db)
        cursor = conn.cursor()
        query = "SELECT osm_id, centroid_x, centroid_y, air_mark FROM air_marks;" 
        cursor.execute(query)
        results = cursor.fetchall()
        
        i = 1
        for row in results:
            i += 1
            centroid_x = row[1]
            centroid_y = row[2]
            air_quality = row[3]
            print('air quality',air_quality)
            # Find the nearest edge to the centroid coordinates
            point = Point(centroid_x, centroid_y)
            edge = self.closest_edge_to_point(point)
            #atribuim valoarea tuturor edge urilor dintr o arie -> 50m
            if edge:
                u, v, data = edge  # Unpack edge tuple
                data['air_mark'] = air_quality  # Assign air quality mark to the edge data

        # If needed, apply the air quality mark to all edges (in case of missing data)
        i = 1
        for u, v, data in self.G.edges(data=True):
            print(i)
            i += 1
            # You can assign a default air quality value or something random if no specific data is available
            if 'air_mark' not in data:
                data['air_mark'] = 1  # Example of assigning a random air quality mark
    
    def set_air_quality(self):
        db=self.DB_CONFIG
        conn = psycopg2.connect(**db)
        cursor = conn.cursor()
        query = "SELECT latitude, longitude, pm25, pm10 FROM air_quality;" 
        cursor.execute(query)
        results = cursor.fetchall()
        
        i = 1
        for row in results:
            print(i)
            i += 1
            latitude = row[0]
            longitude = row[1]
            pm25 = row[2]
            pm10 = row[3]
            print('coordinates:',longitude,latitude)
            index=self.get_index(pm25,pm10)
            print('air quality',index)
            # Find the nearest edge to the centroid coordinates
            point = Point(longitude, latitude)
            #now get the list of corresponding edges and set air index for all of them
            edge_list=self.get_edges_in_radius(point,self.G)
            for edge in edge_list:
                u,v,data=edge
                data['air_mark']=index

        
    # get index based on pm data: 1- very good, 2-good, 3-bad, 4-very bad
    def get_pm2_index(self,pm2):
        if pm2<=15:
            return 1
        elif pm2<=25:
            return 2
        elif pm2<=50:
            return 3
        else:
            return 4
    
    def get_pm10_index(self,pm10):
        if pm10<=30:
            return 1
        elif pm10<=50:
            return 2
        elif pm10<=100:
            return 3
        else:
            return 4

    def get_index(self,pm2,pm10):
        return max(self.get_pm2_index(pm2),self.get_pm10_index(pm10))
    
    def get_edges_in_radius(self,point, G, radius=1000):
        """
        Returns all edges in the graph that are within a given radius (1km default) from a point.
        
        :param point: A shapely.geometry.Point object (longitude, latitude).
        :param G: The graph.
        :param radius: Radius in meters within which to find edges.
        :return: List of edges (tuples of (u, v, data)).
        """
        # Convert lat/lon to a metric projection (EPSG:3857)
        transformer = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
        point_x, point_y = transformer.transform(point.x, point.y)  # Convert point to meters

        nearby_edges = []
        count = 0

        for u, v, data in self.G.edges(data=True):
            # Convert edge geometry to metric projection
            if 'geometry' in data:
                edge_geometry = data['geometry']
                edge_coords = [(transformer.transform(x, y)) for x, y in edge_geometry.coords]
                edge_geometry = LineString(edge_coords)  # Convert back to LineString
            else:
                u_coords = transformer.transform(G.nodes[u]['x'], G.nodes[u]['y'])
                v_coords = transformer.transform(G.nodes[v]['x'], G.nodes[v]['y'])
                edge_geometry = LineString([u_coords, v_coords])

            # Check if edge is within the given radius in meters
            if Point(point_x, point_y).distance(edge_geometry) <= radius:
                nearby_edges.append((u, v, data))
                count += 1

        print('Edges found:', count)
        return nearby_edges
    
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



