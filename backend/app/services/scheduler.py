import threading
import time
from app.repositories.AirQualityRepo import AirQualityRepo
from app.repositories.GraphRepo import CustomGraph
import psycopg2

class Scheduler:
    def __init__(self,graph):
        self.G=graph
        self.host = "localhost"
        self.dbname = "walk_safe_4"
        self.user = "postgres"
        self.password = "semiluna123"

    def run_thermal_periodically(self):
        try:
                # Connect to the PostgreSQL database
                conn = psycopg2.connect(
                    host=self.host,
                    dbname=self.dbname,
                    user=self.user,
                    password=self.password
                )
                cursor = conn.cursor()
                while True:
                    CustomGraph.thermal_comfort_raster(cursor)
                    time.sleep(60 *60 *4)  # Sleep for 4 hours
        except Exception as e:
            print(f"An error occurred while fetching raster: {e}")    
    
    def run_air_periodically(self):
        while True:
            air_quality_data = AirQualityRepo.fetch_air_quality()
            if air_quality_data:
                AirQualityRepo.update_database(air_quality_data)
                AirQualityRepo.set_air_quality()
            time.sleep(600)

    def start_thermal_comfort_thread(self):
        thread = threading.Thread(target=self.run_thermal_periodically, daemon=True)
        thread.start()

    def start_air_quality_thread(self):
        thread=threading.Thread(target=self.run_air_periodically,daemon=True)
        thread.start()
