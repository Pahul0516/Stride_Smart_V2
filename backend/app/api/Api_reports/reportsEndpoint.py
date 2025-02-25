import base64
from flask import Blueprint, request, jsonify, current_app
from app.repositories.ReportRepo import ReportRepo
from itertools import pairwise

report_bp = Blueprint('report_bp', __name__)

@report_bp.route('/load_new_report',methods=['POST'])
def load_new_report():
    data = request.json
    try:
        reportRepo= ReportRepo('localhost','walk_safe_3','postgres','semiluna123')
        reportRepo.add_report(data)
        return jsonify({'message': 'Report created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@report_bp.route('/view_reports',methods=['GET'])
def send_all_reports():
    try:
        reportRepo= ReportRepo('localhost','walk_safe_3','postgres','semiluna123')
        rows = reportRepo.get_all_reports()
        reports = []
        for row in rows:
            reports.append({
                'report_id': row[0],
                'latitude':row[1],
                'longitude':row[2],
                'type': row[3],
                'description': row[4],
                'photos': [base64.b64encode(photo).decode('utf-8') for photo in row[5]], 
                'created_at': row[6].isoformat(),
                'account_id': row[7]
            })
        return jsonify(reports), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500