from flask_cors import CORS
from app.factory import create_app

if __name__ == '__main__':
    Aplication = create_app()
<<<<<<< HEAD
<<<<<<< HEAD
    Aplication.run(debug=False, port=5001)
=======
    #app = Flask(__name__)
    #CORS(Application)
=======
>>>>>>> 503e055 (removed comments)
    Aplication.run(debug=False, port=5501)
>>>>>>> 243604a (Nature Path)
