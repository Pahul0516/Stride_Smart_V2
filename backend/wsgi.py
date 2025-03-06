import sys
import os

# Ensure the application directory is in the Python path
sys.path.insert(0, "/home/paul.berindeie/Stride_Smart/backend")

# Load the Flask application
from app.factory import create_app

# Create the WSGI application
application = create_app()