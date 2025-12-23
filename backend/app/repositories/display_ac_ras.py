import psycopg2
import rasterio
import numpy as np
import matplotlib.pyplot as plt
import io
from matplotlib.colors import ListedColormap

# Database connection settings
DB_SETTINGS = {
    "dbname": "maps_db",
    "user": "postgres",
    "password": "Qwertyuiop12!",
    "host": "localhost"
}

def fetch_raster():
    """Fetches raster data from the PostgreSQL database."""
    connection = psycopg2.connect(**DB_SETTINGS)
    cursor = connection.cursor()

    # SQL query to get the raster
    sql = "SELECT ST_AsTIFF(raster_map) FROM thermal_comfort_rasters WHERE id_harta = %s"
    cursor.execute(sql, (16,))  # Change ID if needed
    raster_data = cursor.fetchone()

    cursor.close()
    connection.close()

    if raster_data and raster_data[0]:
        return io.BytesIO(raster_data[0])  # Convert to in-memory file
    else:
        print("No raster data found.")
        return None

def display_raster(raster_bytes):
    """Displays the raster using rasterio and matplotlib."""
    if raster_bytes is None:
        return
    
    with rasterio.open(raster_bytes) as src:
        print('raster data: ',src.profile)
        raster = src.read(1)  # Read the first band
        # print("Raster min/max:", np.min(raster), np.max(raster))
        # raster = (raster - np.min(raster)) / (np.max(raster) - np.min(raster))
        # mask = (raster >= 1) & (raster <= 4)
        # raster = np.where(mask, raster, np.nan)
        # raster=(raster - 1) / (4 - 1)
        plt.figure()
        plt.imshow(raster,cmap='Greys')
        plt.colorbar(label="Pixel Intensity")
        plt.title("Raster from PostgreSQL")
        plt.show()

# Fetch and display raster
# raster_bytes = fetch_raster()
# display_raster(raster_bytes)
# with rasterio.open("D:/WalkSafe/MOBILE/GOOD_thermal_comfort_rasters/sum_13.tif") as src:
#     colormap = src.colormap(1)  # Assuming 1st band
# print(colormap)

# raster_bytes = fetch_raster()
# display_raster_3(raster_bytes)

import cv2
raster = cv2.imread("D:/WalkSafe/MOBILE/GOOD_thermal_comfort_rasters/sum_13.tif")  # Reads as BGR
raster = cv2.cvtColor(raster, cv2.COLOR_BGR2RGB)

unique_colors = np.unique(raster.reshape(-1, 3), axis=0)
print("Unique RGB colors:", unique_colors)
print(f"Total unique colors: {len(unique_colors)}")

# with rasterio.open("D:/WalkSafe/MOBILE/GOOD_thermal_comfort_rasters/sum_13.tif") as src:
#     raster = src.read(1)  # Read the first (and only) band
#     unique_values = np.unique(raster)  # Get unique pixel values
#     print("Unique raster values:", unique_values)

import datetime

# using now() to get current time
current_time = datetime.datetime.now()
print(current_time.month)
#returns the id of the raster map that should be taken into consideration when calculating
def get_fitting_raster():
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

print(get_fitting_raster())


