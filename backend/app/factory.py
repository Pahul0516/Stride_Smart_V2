import os
from flask import Flask
from flask_cors import CORS
# from .config.settings import Config
# from .models.database import db
# from .routes import register_routes
from app.domain.entities import CustomGraph
from app.routes import register_routes

def create_app():

    #Aplication = Flask(__name__, template_folder='../../frontend/templates', static_folder='../../frontend/static')
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    Aplication = Flask(
        __name__,
        template_folder=os.path.join(BASE_DIR, "../../frontend/templates"),
        static_folder=os.path.join(BASE_DIR, "../../frontend/static")
	#static_url_path='/projects/2/static'  # This changes Flask's URL for static files
    )
    CORS(Aplication)
    
    # customGraph = CustomGraph()
    # Aplication.config["CustomGraph"] = customGraph.get_graph()
    register_routes(Aplication)
    
    return Aplication
