from app.services.aco import AntColony
import networkx as nx
import osmnx as ox
import numpy as np


class TouristPath:
    G = None
    start_node = None
    filter = []
    path = None
    map = {}

    def __init__(self, G, filter):
        self.G = G
        self.filter = filter

    def set_filter(self,filter):
        self.filter=filter

    def mapping(self, start_node):
        self.map[0] = start_node
        i = 1
        criteria = ''
        for criteria in self.filter:
            for point in self.G.graph['tourists_points'][criteria]:
                self.map[i] = point
                i += 1
            
    def create_matirx(self):
        distance_matrix = np.zeros((len(self.map), len(self.map)))
        for i, source in enumerate(self.map.values()):
            for j, target in enumerate(self.map.values()):
                if i == j:
                    distance_matrix[i][j] = np.inf
                else:
                    distance_matrix[i][j] = nx.shortest_path_length(
                        self.G, source, target, weight='length'
                    )   
                    if distance_matrix[i][j]==0:
                        distance_matrix[i][j]=9999999
        return distance_matrix

    def get_points(self, mat):
        ant_colony = AntColony(mat, 10, 1, 200, 0.95, alpha=1, beta=2)
        shortest_path = ant_colony.run()
        points_list = []
        for point in shortest_path[0]:
            points_list.append(point[0])
        return points_list

    def get_path(self,start_coords):
        self.start_node = ox.distance.nearest_nodes(self.G, X=start_coords['lng'], Y=start_coords['lat']) 
        self.mapping(self.start_node)
        list_of_points = self.get_points(self.create_matirx())
        concatenated_path = []
    
        for i in range(len(list_of_points) - 1):
            current_node = self.map[list_of_points[i]]
            next_node = self.map[list_of_points[i + 1]]
                
            path_segment = nx.shortest_path(self.G, source=current_node, target=next_node, weight='length')
                
            if concatenated_path:
                concatenated_path.extend(path_segment[1:])  
            else:
                concatenated_path.extend(path_segment)  
        self.path = concatenated_path
        return self.path