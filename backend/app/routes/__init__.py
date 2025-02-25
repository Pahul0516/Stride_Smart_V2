from flask import Flask
from app.api.Api_routes.greenRouteEndpoint import green_routes_bp
from app.api.Api_routes.safeRouteEndpoint import safest_route_bp
from app.api.Api_routes.accessibleRouteEndpoint import accessible_route_bp
from app.api.Api_routes.airQualityRouteEndpoint import air_quality_route_bp
from app.api.Api_routes.termalConfortRouteEndpoint import thermal_comfort_route_bp
from app.api.Api_routes.combinedRouteEndpoint import combined_route_bp
from app.api.Api_routes.touristRouteEndpoint import tourist_route_bp
from app.api.Frontend.front import frontend_bp
from app.api.Api_login.loginEndpoint import login_bp
from app.api.Api_login.createAccountEndpoint import create_account_bp
from app.api.Api_reports.reportsEndpoint import report_bp

def register_routes(app: Flask):
    app.register_blueprint(green_routes_bp)
    app.register_blueprint(safest_route_bp)
    app.register_blueprint(accessible_route_bp)
    app.register_blueprint(air_quality_route_bp)
    app.register_blueprint(thermal_comfort_route_bp)
    app.register_blueprint(combined_route_bp)
    app.register_blueprint(tourist_route_bp)
    app.register_blueprint(frontend_bp)
    app.register_blueprint(login_bp)
    app.register_blueprint(create_account_bp)
    app.register_blueprint(report_bp)