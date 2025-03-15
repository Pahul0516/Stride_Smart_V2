import os
import sys
from flask import Blueprint, Flask, send_from_directory, jsonify
from flask_cors import CORS

sys.stdout.reconfigure(line_buffering=True)

BASE_DIRECTORIES = {
    "accessibility": r"D:\WalkSafe\Refactor\m100-projects-the-walkie-talkie\Database\data\Accessibility",
    "thermal_comfort": r"C:\Users\Bianca\WebstormProjects\project\data\thermal_comfort"
}

accessible_overlay_bp = Blueprint('accessible_overlay', __name__)


@accessible_overlay_bp.route('/tiles/<overlay_type>/<option>/<z>/<x>/<y>.png')
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
