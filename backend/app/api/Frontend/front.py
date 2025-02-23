from flask import render_template
from flask import Blueprint


frontend_bp =  Blueprint('app', __name__)

@frontend_bp.route('/')
def home():
    return render_template('index.html') 

@frontend_bp.route('/login')
def login():
    return render_template('login.html') 

@frontend_bp.route('/map')
def map_page():
    return render_template('map.html') 

@frontend_bp.route('/register')
def register():
    return render_template('register.html') 