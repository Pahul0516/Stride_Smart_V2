# import geopandas as gpd
# import os
#
# # Define the base filename (without extension)
# base_filename = r"C:\Users\Bianca\Documents\Ape_Cluj\Ape_Cluj\Zona_accesibila"
#
# # Ensure required files exist
# required_extensions = [".shp", ".shx", ".dbf", ".prj"]
# missing_files = [ext for ext in required_extensions if not os.path.exists(f"{base_filename}{ext}")]
# if missing_files:
#     raise FileNotFoundError(f"Missing required files: {', '.join(missing_files)}")
#
# # Path to the .shp file
# shapefile_path = f"{base_filename}.shp"
#
# # Load the shapefile into a GeoDataFrame
# gdf = gpd.read_file(shapefile_path)
#
# # Check the current CRS
# print("Original CRS:", gdf.crs)
#
# # If CRS is not set, define it (e.g., EPSG:32635 for UTM Zone 35N)
# if gdf.crs is None:
#     gdf.set_crs("EPSG:32635", inplace=True)  # Replace EPSG:32635 with your actual CRS
#
# # Reproject the GeoDataFrame to WGS84 (latitude and longitude)
# gdf = gdf.to_crs("EPSG:4326")
#
# # Convert to GeoJSON (geospatial JSON format)
# geojson_output_path = r"C:\Users\Bianca\WebstormProjects\project\data\Zona_accesibila_reprojected.geojson"
# gdf.to_file(geojson_output_path, driver="GeoJSON")
#
# print(f"Reprojected GeoJSON saved to {geojson_output_path}")

import geopandas as gpd
import json


def reproject_to_epsg4326(input_file, output_file):
    """
    Reproject a GeoJSON file to EPSG:4326.

    Args:
        input_file (str): Path to the input GeoJSON file.
        output_file (str): Path to save the reprojected GeoJSON file.
    """
    try:
        # Load the GeoJSON as a GeoDataFrame
        gdf = gpd.read_file(input_file)

        # Check if the GeoDataFrame has a CRS set
        if gdf.crs is None:
            print("No CRS found in the input file. Assuming EPSG:4326 as the current CRS.")
            gdf.set_crs("EPSG:4326", inplace=True)
        else:
            print(f"Current CRS: {gdf.crs}")

        # Reproject to EPSG:4326
        gdf = gdf.to_crs("EPSG:4326")
        print(f"Reprojected to EPSG:4326")

        # Save the reprojected GeoDataFrame to GeoJSON
        gdf.to_file(output_file, driver="GeoJSON")
        print(f"Reprojected GeoJSON saved to {output_file}")

    except Exception as e:
        print(f"An error occurred: {e}")


# Example usage
if __name__ == "__main__":
    input_file = r"C:\Users\Bianca\WebstormProjects\project\data\zone_neaccesibile.json"  # Replace with your input GeoJSON file
    output_file = r"C:\Users\Bianca\WebstormProjects\project\data\zone_neaccesibile_reprojected.geojson"  # Replace with your desired output GeoJSON file
    reproject_to_epsg4326(input_file, output_file)
