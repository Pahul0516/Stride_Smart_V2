import networkx as nx
import osmnx as ox

class AirQualityPath:
    G = None
    path = None
    custom_graph=None
    start_node = None
    goal_node = None
    alpha = 0.5
    beta = 0.5

    def __init__(self, G,custom_graph):
        self.G = G
        self.custom_graph=custom_graph

    def set_alpha(self, alpha):
        self.alpha = alpha

    def set_beta(self, beta):
        self.beta = beta

    def custom_cost(self, u, v, data):
        try:
            length = data[0].get('length', float('inf'))

            # Retrieve 'AirQuality' from the custom graph
            # Assuming `self.custom_graph` is your custom graph
            if self.custom_graph.has_edge(u, v):
                air_quality = float(self.custom_graph[u][v].get('AirQuality', 0.0))  # Default to 4.0 if missing
            else:
                air_quality = 0.0  # Penalize if no edge exists in the custom graph

            # Normalize the values
            L = (length - 0.24) / (3201.74 - 0.24)
            A = (air_quality - 0.0) / (4.0 - 0.0)

            # Weighted cost
            W = self.alpha * L + self.beta * A

            # Debugging: Ensure W is real
            if isinstance(W, complex):
                raise ValueError(f"Complex cost encountered: W={W}, length={length}, air_quality={air_quality}")
            return W

        except Exception as e:
            print(f"Error in custom_cost for edge ({u}, {v}): {e}")
            raise

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