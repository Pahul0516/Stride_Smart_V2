import os
import sys
import time
from datetime import datetime, timezone
import psycopg2
from flask import Blueprint, Flask, send_from_directory, jsonify
from flask_cors import CORS

sys.stdout.reconfigure(line_buffering=True)

BASE_DIRECTORIES = {
    "accessibility": r"/home/paul.berindeie/Stride_Smart/frontend/static/tiles/accessibility/none",
    "thermal_comfort": r"/home/paul.berindeie/Stride_Smart/frontend/static/tiles/thermal_comfort"
}

accessible_overlay_bp = Blueprint('accessible_overlay', __name__)
get_air_quality_overlay_bp = Blueprint('get-air-quality-overlay', __name__)

DB_CONFIG = {
    "dbname": "maps_db",
    "user": "postgres",
    "password": "Qwertyuiop12!",
    "host": "localhost",
}

@accessible_overlay_bp.route('/projects/2/static/tiles/<overlay_type>/<option>/<z>/<x>/<y>.png')
def serve_tile(overlay_type, option, z, x, y):
    if overlay_type not in BASE_DIRECTORIES:
        return jsonify({"error": "Invalid overlay type"}), 400

    if overlay_type == "accessibility":
        tile_path = os.path.join(BASE_DIRECTORIES["accessibility"], z, x, f"{y}.png")
        print('tile path:', tile_path)

    elif overlay_type == "thermal_comfort":
        print("Here")
        valid_options = {"win_09", "win_12", "win_15", "spr_08", "spr_12", "spr_16", "sum_07", "sum_13", "sum_17", "fall_08", "fall_12", "fall_16"}

        if option not in valid_options:
            return jsonify({"error": "Invalid thermal comfort option"}), 400

        tile_path = os.path.join(BASE_DIRECTORIES["thermal_comfort"], option, z, x, f"{y}.png")
        print(tile_path)

    if not os.path.exists(tile_path):
        return jsonify({"error": "Tile not found"}), 404

    return send_from_directory(os.path.dirname(tile_path), os.path.basename(tile_path))


@get_air_quality_overlay_bp.route('/projects/2/get-air-quality-overlay', methods=['GET'])
def get_air_quality():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute("SELECT station_name, latitude, longitude, pm25, pm10 FROM air_quality;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([
        {
            "station_name": r[0],
            "latitude": float(r[1]),
            "longitude": float(r[2]),
            "pm25": int(r[3]),
            "pm10": int(r[4])
        } for r in rows
    ])