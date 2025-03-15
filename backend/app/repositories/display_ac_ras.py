import psycopg2
import rasterio
import numpy as np
import matplotlib.pyplot as plt
import io

# Database connection settings
DB_SETTINGS = {
    "dbname": "walk_safe_4",
    "user": "postgres",
    "password": "semiluna123",
    "host": "localhost"
}

def fetch_raster():
    """Fetches raster data from the PostgreSQL database."""
    connection = psycopg2.connect(**DB_SETTINGS)
    cursor = connection.cursor()

    # SQL query to get the raster
    sql = "SELECT ST_AsTIFF(raster_map) FROM accessible_raster WHERE id_harta = %s"
    cursor.execute(sql, (2,))  # Change ID if needed
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
        raster = src.read(1)  # Read the first band
        cmap = "Reds"  # Use 'Greens' colormap for green spaces

        plt.figure()
        plt.imshow(raster,cmap='Reds')
        plt.colorbar(label="Pixel Intensity")
        plt.title("Raster from PostgreSQL")
        plt.show()

# Fetch and display raster
raster_bytes = fetch_raster()
display_raster(raster_bytes)
