import io
import numpy as np
import psycopg2
import rasterio
from shapely import LineString
from rasterio.mask import mask

class GreenRouteRepo:
    def __init__(self,G,host,dbname,user,password):
        self.G = G
        try:
            self.__connection = psycopg2.connect(
            host = host,
            dbname = dbname,
            user = user,
            password = password
            )
        except Exception as e: 
            print(f"Exception: {e}") 
        cursor = self.__connection.cursor()

    def get_graph(self):
        return self.G

    

    
# cu acest data se calculeaza rutele verzi - imi trebuie data la service, custom weight