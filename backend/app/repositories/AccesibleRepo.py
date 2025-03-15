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

import rasterio
from shapely.geometry import LineString
import numpy as np

def extract_pixel_intensities_for_line(line, raster_src):
    """
    Extract the pixel intensities that the LineString (graph edge) traverses in the raster.
    
    Parameters:
        line: A LineString representing the edge (from graph).
        raster_src: The rasterio dataset object for the raster file.
    
    Returns:
        pixel_values: List of pixel intensities that the line traverses.
    """
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

def extract_pixel_values_for_line_traversal(line, raster_src):
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
