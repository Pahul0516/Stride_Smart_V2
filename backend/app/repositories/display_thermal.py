import psycopg2
import rasterio
import numpy as np
import matplotlib.pyplot as plt
import io
from matplotlib.colors import ListedColormap


DB_SETTINGS = {
    "dbname": "maps_db",
    "user": "postgres",
    "password": "Qwertyuiop12!",
    "host": "localhost"
}

# File path to your multi-band raster (e.g., RGB TIFF)
raster_path = "D:/WalkSafe/MOBILE/GOOD_thermal_comfort_rasters/win_15.tif"

with rasterio.open(raster_path) as src:
    print("Number of bands:", src.count)  # Should print 3 for RGB
    
    # Read the raster data as a NumPy array
    raster_data = src.read([1, 2, 3])  # Read the first 3 bands (RGB)
    
    # Now, instead of writing directly, we'll convert the raster data to TIFF bytes
    # Prepare the TIFF data as a byte stream
    with io.BytesIO() as memfile:
        # Writing the raster data as a TIFF to memory
        kwargs = src.profile
        kwargs.update({
            'driver': 'GTiff',
            'count': 3,  # Number of bands
            'dtype': 'uint8'  # Adjust dtype to fit your raster
        })
        
        with rasterio.open(memfile, 'w', **kwargs) as dst:
            for i in range(0,2):  # Write each band (RGB)
                dst.write(raster_data[i+1], i + 1)  # Bands are 1-indexed
        
        # Move the pointer to the beginning of the memory buffer
        memfile.seek(0)
        raster_byte_data = memfile.read()  # Get the byte content of the raster

# Now you can insert raster_byte_data into your PostgreSQL database

def insert_raster_to_db(raster_byte_data):
    # Connect to your PostgreSQL database
    conn = psycopg2.connect(
        dbname="walk_safe_4",
        user="postgres",
        password="semiluna123",
        host="localhost"
    )
    cursor = conn.cursor()

    # Insert raster data into the database
    sql = """
    INSERT INTO thermal_comfort_rasters (nume_harta, raster_map)
    VALUES (%s, ST_FromGDALRaster(%s::bytea))
    """
    
    # Provide ID for the raster (change to your value) and insert the raster bytes
    cursor.execute(sql, ('win_15', raster_byte_data))  # For example, id_harta = 16

    conn.commit()  # Commit the transaction
    cursor.close()
    conn.close()

    print("Raster inserted successfully.")

# Insert the raster into the database
# insert_raster_to_db(raster_byte_data)

def fetch_raster():
    """Fetches raster data from the PostgreSQL database."""
    connection = psycopg2.connect(**DB_SETTINGS)
    cursor = connection.cursor()

    # SQL query to get the raster
    sql = "SELECT ST_AsTIFF(raster_map) FROM thermal_comfort_rasters WHERE id_harta = %s"
    cursor.execute(sql, (6,))  # Change ID if needed
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
        plt.imshow(raster,cmap='Reds')
        plt.colorbar(label="Pixel Intensity")
        plt.title("Raster from PostgreSQL")
        plt.show()

display_raster(fetch_raster())
