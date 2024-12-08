import pandas as pd
import geojson

file_path = '../data/filtered_sorted_air_quality.csv'
data = pd.read_csv(file_path)

data.fillna(value="Unknown", inplace=True)

data = data.dropna(subset=['coord X', 'coord Y'])

features = []
for _, row in data.iterrows():
    feature = geojson.Feature(
        geometry=geojson.Point((row['coord X'], row['coord Y'])),
        properties={key: row[key] for key in data.columns if key not in ['coord X', 'coord Y']}
    )
    features.append(feature)

feature_collection = geojson.FeatureCollection(features)

geojson_file = "../data/air_quality2.geojson"
with open(geojson_file, "w") as f:
    geojson.dump(feature_collection, f)

print(f"GeoJSON file saved to {geojson_file}")


# import csv
# import geojson
#
#
# def dms_to_decimal(degrees, minutes, seconds, direction):
#     decimal = degrees + minutes / 60 + seconds / 3600
#     if direction in ['S', 'W']:
#         decimal *= -1
#     return decimal
#
#
# def parse_dms(dms_str):
#     dms_str = dms_str.replace('""', '').strip()
#     dms_str = dms_str.replace('°', '° ').replace("'", "' ").replace('"', '" ')
#
#     dms_parts = dms_str.split()
#
#     degrees = float(dms_parts[0].replace("°", "").strip())
#     minutes = float(dms_parts[1].replace("'", "").strip())
#
#     seconds_direction = dms_parts[2]
#     if seconds_direction[-1] in 'NEWS':
#         seconds = float(seconds_direction[:-1])
#         direction = seconds_direction[-1]
#     else:
#         seconds = float(seconds_direction.strip())
#         direction = dms_parts[3].strip()
#
#     return dms_to_decimal(degrees, minutes, seconds, direction)
#
#
# def csv_to_geojson(csv_file, geojson_file):
#     features = []
#
#     with open(csv_file, 'r', encoding='utf-8-sig') as file:
#         reader = csv.DictReader(file, delimiter=',')
#
#         if not {'grad', 'latitudine', 'longitudine'}.issubset(reader.fieldnames):
#             raise KeyError(
#                 f"CSV file must contain the headers: 'grad', 'latitudine', 'longitudine'. Found: {reader.fieldnames}")
#
#         for row in reader:
#             try:
#                 lat = parse_dms(row['latitudine'])
#                 lon = parse_dms(row['longitudine'])
#                 grade = int(row['grad'])
#
#                 point = geojson.Point((lat, lon))
#                 feature = geojson.Feature(geometry=point, properties={"grad": grade})
#                 features.append(feature)
#             except KeyError as e:
#                 print(f"Missing key in row: {row}. Error: {e}")
#             except ValueError as e:
#                 print(f"Invalid value in row: {row}. Error: {e}")
#
#     feature_collection = geojson.FeatureCollection(features)
#
#     with open(geojson_file, 'w', encoding='utf-8') as geojson_out:
#         geojson.dump(feature_collection, geojson_out, indent=4)
#
#     print(f"GeoJSON file successfully created at: {geojson_file}")
#
#
# csv_file = '../data/road_crash_density.csv'
# geojson_file = '../data/road_crash_density.geojson'
#
# try:
#     csv_to_geojson(csv_file, geojson_file)
# except KeyError as e:
#     print(f"Error: {e}")

