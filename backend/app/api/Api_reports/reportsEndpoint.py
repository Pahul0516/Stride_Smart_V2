import base64
from flask import Blueprint, request, jsonify, current_app
from app.repositories.ReportRepo import ReportRepo
from itertools import pairwise
from app.repositories.AccountRepo import AccountRepo

report_bp = Blueprint('report_bp', __name__)

@report_bp.route('/load_new_report',methods=['POST'])
def load_new_report():
    data = request.json
    try:
        reportRepo= ReportRepo('localhost','Maps_DB','postgres','Qwertyuiop12')
        reportRepo.add_report(data)
        return jsonify({'message': 'Report created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@report_bp.route('/view_reports',methods=['GET'])
def send_all_reports():
    try:
        reportRepo= ReportRepo('localhost','Maps_DB','postgres','Qwertyuiop12')
        accountRepo=AccountRepo('localhost','Maps_DB','postgres','Qwertyuiop12')
        report_list = reportRepo.get_all_reports()
        reports = []
        for report in report_list:
            username=accountRepo.findAccountName(report[7])
            print('report[7]: ',report[7])
            reports.append({
                'report_id': report[0],
                'latitude':report[1],
                'longitude':report[2],
                'type': report[3],
                'description': report[4],
                'photos': [base64.b64encode(photo).decode('utf-8') for photo in report[5]], 
                'created_at': report[6].isoformat(),
                'username': username
            })
        return jsonify(reports), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500