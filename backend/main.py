from flask_cors import CORS
from app.factory import create_app

if __name__ == '__main__':
    Aplication = create_app()
    #app = Flask(__name__)
    #CORS(Application)
    Aplication.run(debug=False, port=5501)
