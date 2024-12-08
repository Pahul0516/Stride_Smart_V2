import pandas as pd
from math import radians, sin, cos, sqrt, atan2

file_path = "../data/air_quality.csv"
data = pd.read_csv(file_path)

radius_m = 100

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

data.sort_values(by="AirQuality", ascending=False, inplace=True)

selected_rows = []

selected_coords = []

for _, row in data.iterrows():
    coord_x, coord_y = row["coord X"], row["coord Y"]

    within_radius = any(
        haversine_distance(coord_y, coord_x, selected_y, selected_x) <= radius_m
        for selected_y, selected_x in selected_coords
    )

    if not within_radius:
        selected_rows.append(row)
        selected_coords.append((coord_y, coord_x))

result = pd.DataFrame(selected_rows)

result.sort_values(by="AirQuality", ascending=False, inplace=True)

output_csv_file = "../data/filtered_sorted_air_quality.csv"
result.to_csv(output_csv_file, index=False)
print(f"Filtered and sorted data saved to {output_csv_file}")