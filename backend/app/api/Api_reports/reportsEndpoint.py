import base64
from flask import Blueprint, request, jsonify, current_app
from app.repositories.ReportRepo import ReportRepo
from itertools import pairwise
from app.repositories.AccountRepo import AccountRepo

report_bp = Blueprint('report_bp', __name__)

@report_bp.route('/projects/2/load_new_report',methods=['POST'])
def load_new_report():
    data = request.json
    try:
        reportRepo= ReportRepo('localhost','maps_db','postgres','Qwertyuiop12!')
        reportRepo.add_report(data)
        return jsonify({'message': 'Report created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@report_bp.route('/projects/2/view_reports',methods=['GET'])
def send_all_reports():
    try:
        reportRepo= ReportRepo('localhost','maps_db','postgres','Qwertyuiop12!')
        accountRepo=AccountRepo('localhost','maps_db','postgres','Qwertyuiop12!')
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


@report_bp.route('/projects/2/delete_report/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    try:
        reportRepo = ReportRepo('localhost', 'maps_db', 'postgres', 'Qwertyuiop12!')

        reportRepo.delete_report(report_id)
        return jsonify({'message': f'Report with ID {report_id} deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@report_bp.route('/projects/2/get_all_reports/<int:user_id>', methods=['GET'])
def get_reports_by_user(user_id):
    try:
        reportRepo = ReportRepo('localhost', 'maps_db', 'postgres', 'Qwertyuiop12!')
        accountRepo = AccountRepo('localhost', 'maps_db', 'postgres', 'Qwertyuiop12!')

        report_list = reportRepo.get_reports_by_user_id(user_id)
        reports = []

        for report in report_list:
            username = accountRepo.findAccountName(report[7])
            reports.append({
                'report_id': report[0],
                'latitude': report[1],
                'longitude': report[2],
                'type': report[3],
                'description': report[4],
                'photos': [base64.b64encode(photo).decode('utf-8') for photo in report[5]],
                'created_at': report[6].isoformat(),
                'username': username
            })

        return jsonify(reports), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
