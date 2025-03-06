from app.factory import create_app

if __name__ == '__main__':
    Aplication = create_app()
    Aplication.run(debug=False, port=5001)