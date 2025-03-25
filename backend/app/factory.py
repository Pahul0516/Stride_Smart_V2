from flask import Flask
from flask_cors import CORS
# from .config.settings import Config
# from .models.database import db
# from .routes import register_routes
from app.repositories.GraphRepo import CustomGraph
from app.routes import register_routes
from app.services.scheduler import Scheduler

def create_app():

    Aplication = Flask(__name__, template_folder='../../frontend/templates', static_folder='../../frontend/static')
    CORS(Aplication)
    
    print('instantinating custom graph...')
    customGraph = CustomGraph()
    scheduler=Scheduler(customGraph.G)
    # scheduler.start_thermal_comfort_thread()
    scheduler.start_air_quality_thread()

    Aplication.config["CustomGraph"] = customGraph.get_graph()
    register_routes(Aplication)
    
    return Aplication