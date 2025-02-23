from shapely.geometry import Point
import networkx as nx
import osmnx as ox

class AccessibilityPath:
    G = None
    path = None
    start_node = None
    goal_node = None

    def __init__(self, G):
        self.G = G

    def custom_cost(self, u, v, data):
        length = data[0].get('length', float('inf'))
        accessibility = True
        point_u = Point(self.G.nodes[u]['x'], self.G.nodes[u]['y'])
        point_v = Point(self.G.nodes[v]['x'], self.G.nodes[v]['y'])
    
        for polygon in self.G.graph['non_accessible_polygons']:
            if polygon.contains(point_u) or polygon.contains(point_v):
                print("punct inaccesibil")
                accessibility = False
        
        if accessibility:
            W = length
        else:
            W =  length + 99999999
        return W
    def heuristic(self, u, v):
        (x1, y1) = self.G.nodes[u]['x'], self.G.nodes[u]['y']
        (x2, y2) = self.G.nodes[v]['x'], self.G.nodes[v]['y']
        return ((x2 - x1) * 2 + (y2 - y1) * 2) ** 0.5  # Euclidean distance
    def get_path(self,start_coords,goal_coords):
        self.start_node = ox.distance.nearest_nodes(self.G, X=start_coords['lng'], Y=start_coords['lat'])  # X is longitude, Y is latitude
        self.goal_node = ox.distance.nearest_nodes(self.G, X=goal_coords['lng'], Y=goal_coords['lat'])
        self.path = nx.astar_path(self.G, source=self.start_node, target=self.goal_node, weight=self.custom_cost, heuristic=self.heuristic)
        return self.path