
import psycopg2

class ReportRepo:
    def __init__(self,host,dbname,user,password):
        try:
            self.__connection = psycopg2.connect(
            host = host,
            dbname = dbname,
            user = user,
            password = password
            )
            print('connected successfully to db')
        except Exception as e: 
            print(f"Exception: {e}") 
        
    def get_connection(self):
        return self.__connection
    
    def get_all_reports(self):
        try:
            cursor = self.__connection.cursor()
            cursor.execute("""
                SELECT report_id,latitude,longitude,report_type, description, photos, created_at,user_id
                FROM reports
            """)
            rows = cursor.fetchall()
            cursor.close() 
            return rows

        except Exception as e:
            print(f"Error connecting to database: {e}")
            return False
        
    def add_report(self,data):
        latitude=data['latitude']
        longitude=data['longitude']
        report_type = data['type']
        description = data['description']
        photos = data['photos']
        user_id=data['user_id']
        try:
            conn = psycopg2.connect(
            host = "localhost",
            dbname = "maps_db",
            user = "postgres",
            password = "Qwertyuiop12!"
            )
            photos_bytes = [bytes(photo) for photo in photos]
            print('photos bytes:',photos_bytes)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO reports (latitude,longitude,report_type, description, photos,user_id)
                VALUES (%s, %s, %s, %s, %s,%s)
                """,
                (latitude,longitude,report_type, description, photos_bytes,user_id)
            )
            conn.commit()
            cursor.close()
        except Exception as e:
            conn.rollback()
            return e

    def delete_report(self, report_id):
        try:
            conn = psycopg2.connect(
                host="localhost",
                dbname="maps_db",
                user="postgres",
                password="Qwertyuiop12!"
            )
            cursor = conn.cursor()
            cursor.execute("DELETE FROM reports WHERE report_id = %s", (report_id,))
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            conn.rollback()
            return e

    def get_reports_by_user_id(self, user_id):
        try:
            conn = psycopg2.connect(
                host="localhost",
                dbname="maps_db",
                user="postgres",
                password="Qwertyuiop12!"
            )
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM reports WHERE user_id = %s", (user_id,))
            reports = cursor.fetchall()
            cursor.close()
            conn.close()
            return reports
        except Exception as e:
            return []
