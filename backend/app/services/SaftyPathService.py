import networkx as nx
import osmnx as ox

class SaftyPath:
    G = None
    path = None
    start_node = None
    goal_node = None
    alpha = 0.5
    beta = 0.5
    def __init__(self, G):
        self.G = G

    def set_alpha(self, alpha):
        self.alpha= alpha
    def set_beta(self, beta):
        self.beta = beta

    def custom_cost(self, u, v, data):
        length = data[0].get('length', float('inf'))  # Use a large value if length is missing

        accident_frequency = data[0].get('accident_frequency', 0)

        L = (length - 0.24) / (3201.74 - 0.24)
        A = (accident_frequency - 0) / (3 - 0)

        W = self.alpha * L + self.beta * A
        return W
    def heuristic(self, u, v):
        (x1, y1) = self.G.nodes[u]['x'], self.G.nodes[u]['y']
        (x2, y2) = self.G.nodes[v]['x'], self.G.nodes[v]['y']
        return ((x2 - x1) * 2 + (y2 - y1) * 2) ** 0.5  # Euclidean distance
    
    def get_path(self,start_coords,goal_coords,alpha = 0.5, beta = 0.5):
        self.set_alpha(alpha)
        self.set_beta(beta)
        # Find the nearest nodes to the start and goal coordinates
        self.start_node = ox.distance.nearest_nodes(self.G, X=start_coords['lng'], Y=start_coords['lat'])  # X is longitude, Y is latitude
        self.goal_node = ox.distance.nearest_nodes(self.G, X=goal_coords['lng'], Y=goal_coords['lat'])
        self.path = nx.astar_path(self.G, source=self.start_node, target=self.goal_node, weight=self.custom_cost, heuristic=self.heuristic)
        return self.path  
