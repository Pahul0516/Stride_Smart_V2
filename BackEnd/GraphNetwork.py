import osmnx as ox
import networkx as nx
import matplotlib.pyplot as plt
import os

#generate the full network for cluj-napoca, and add it to a .geojson file (osm_edges.geojson) as list of coordinates
def generateCompleteGraph():
    # Get the road network for Cluj-Napoca
    G = ox.graph_from_place("Cluj-Napoca, Romania", network_type="walk")

    nodes, edges = ox.graph_to_gdfs(G)

    edge_coords = []

    for _, edge in edges.iterrows():
        coords = list(edge['geometry'].coords)
        edge_coords.append(coords)

    target_folder = "../html"  # folder where i want to save the file

    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Construct the full path for the GeoJSON file in the target folder
    file_path = os.path.join(script_dir, target_folder, "osm_edges_new.geojson")

    # Ensure the target folder exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    # Save the file to the constructed path
    edges.to_file(file_path, driver="GeoJSON")

    print('done')




