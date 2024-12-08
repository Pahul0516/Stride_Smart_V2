import geopandas as gpd
import rasterio
from rasterio.features import rasterize, shapes
from rasterio.transform import from_bounds
import numpy as np
import scipy.ndimage
from shapely.geometry import shape

def main():
    # Paths to input and output files
    green_areas_path = "../data/filtered_cluj_polygons.geojson"
    raster_output_path = "../data/comfort_index.tif"
    vector_output_path = "../data/comfort_index.geojson"

    # Load green areas
    green_areas_gdf = gpd.read_file(green_areas_path)

    # Ensure CRS consistency
    if green_areas_gdf.crs is None:
        green_areas_gdf.set_crs("EPSG:4326", inplace=True)

    # Get bounding box and resolution
    xmin, ymin, xmax, ymax = green_areas_gdf.total_bounds
    resolution = 0.0001  # Resolution of raster (smaller = finer grid)
    cols = int((xmax - xmin) / resolution)
    rows = int((ymax - ymin) / resolution)

    # Define raster transform
    transform = from_bounds(xmin, ymin, xmax, ymax, cols, rows)

    # Create an empty raster and rasterize green areas
    green_raster = np.zeros((rows, cols), dtype=np.float32)
    shapes_to_rasterize = [(geom, 1) for geom in green_areas_gdf.geometry]
    green_raster = rasterize(
        shapes=shapes_to_rasterize,
        out_shape=(rows, cols),
        transform=transform,
        fill=0,
        dtype=np.float32,
    )

    # Compute distance to green areas
    distance_raster = scipy.ndimage.distance_transform_edt(
        green_raster == 0, sampling=(resolution, resolution)
    )
    max_distance = distance_raster.max()

    # Normalize the distance raster and invert it for comfort index
    comfort_raster = 1 - (distance_raster / max_distance)

    # Save as GeoTIFF
    with rasterio.open(
        raster_output_path,
        "w",
        driver="GTiff",
        height=rows,
        width=cols,
        count=1,
        dtype=comfort_raster.dtype,
        crs="EPSG:4326",
        transform=transform,
    ) as dst:
        dst.write(comfort_raster, 1)

    print(f"Comfort index raster saved as: {raster_output_path}")

    # Convert raster to polygons
    shapes_generator = shapes(comfort_raster, transform=transform)

    # Extract polygons and their comfort index values
    polygons = []
    values = []
    for geom, value in shapes_generator:
        if value > 0:  # Exclude areas with zero comfort
            polygons.append(shape(geom))
            values.append(value)

    # Create a GeoDataFrame
    comfort_gdf = gpd.GeoDataFrame(
        {"geometry": polygons, "comfort_index": values}, crs="EPSG:4326"
    )

    # Save to GeoJSON
    comfort_gdf.to_file(vector_output_path, driver="GeoJSON")

    print(f"Comfort index polygons saved as: {vector_output_path}")


if __name__ == "__main__":
    main()
