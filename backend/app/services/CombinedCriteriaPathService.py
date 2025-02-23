from shapely.geometry import Point
import networkx as nx
import osmnx as ox


class CombinedCriteriaPath:
    G = None
    path = None
    custom_graph=None
    start_node = None
    goal_node = None
    alpha = 0.5
    beta = 0.5
    is_thermal_comfort=0
    is_green=0
    is_safe=0
    is_accessible=0
    is_air_quality=0

    def __init__(self, G,custom_graph=None,is_thermal_comfort=0,is_air_quality=0,is_green=0,is_safe=0,is_accessible=0):
        self.G = G
        self.custom_graph=custom_graph
        self.is_thermal_comfort=is_thermal_comfort
        self.is_air_quality=is_air_quality
        self.is_green=is_green
        self.is_safe=is_safe
        self.is_accessible=is_accessible

    def set_alpha(self, alpha):
        self.alpha = alpha

    def set_beta(self, beta):
        self.beta = beta

    def custom_cost(self, u, v, data):
        try:
            # Get 'length' from the OSMnx graph
            length = data[0].get('length', float('inf'))

            #get wanted attributes
            comfort_index,air_index,green_index,safe_index=0,0,0,0
            if self.is_thermal_comfort==1:
                if self.custom_graph.has_edge(u, v):
                    comfort_index = float(self.custom_graph[u][v].get('comfort_index', 0.0))  # Default to 0.0 if missing
                    comfort_index=1-comfort_index
                else:
                    comfort_index = 0.0  # Penalize if no edge exists in the custom graph
                #normalize: 
                
            if self.is_air_quality==1:
                if self.custom_graph.has_edge(u, v):
                    air_index = float(self.custom_graph[u][v].get('AirQuality', 0.0))  # Default to 0.0 if missing
                else:
                    air_index = 0.0  # Penalize if no edge exists in the custom graph
                #normalize: 
                air_index = (air_index - 0.0) / (4.0 - 0.0)
            if self.is_green==1:
                green_index = data[0].get('green_index', 0)
                green_index=(green_index - 0.0) / (90 - 0.0)
                green_index=1-green_index
            if self.is_safe==1:
                safe_index = data[0].get('accident_frequency', 0)
                safe_index = (safe_index - 0) / (3 - 0)
            
            A = self.is_thermal_comfort*comfort_index+ self.is_air_quality*air_index + self.is_green*green_index + self.is_safe*safe_index
            L = (length - 0.24) / (3201.74 - 0.24)
            W = self.alpha * L + self.beta * A
            
            #the average of indexes has been computed. but if the point is unaccessible, we wont take it into consideration:
            if self.is_accessible==1:
                accessibility = True
                point_u = Point(self.G.nodes[u]['x'], self.G.nodes[u]['y'])
                point_v = Point(self.G.nodes[v]['x'], self.G.nodes[v]['y'])
                for polygon in self.G.graph['non_accessible_polygons']:
                    if polygon.contains(point_u) or polygon.contains(point_v):
                        accessibility = False
                if accessibility==False:
                    W =  length + 99999999
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
    
