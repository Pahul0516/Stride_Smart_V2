import psycopg2

conn = psycopg2.connect("dbname=dbname user=user password=password")
cursor = conn.cursor()

# Read the image as binary 1: potole, 2: construction, 3: broken_sidewalk, 4: other  
with open("BackEnd\other.png", "rb") as img_file:
    binary_data = img_file.read()

# Insert into the database
cursor.execute("INSERT INTO report_icons (image_data) VALUES (%s)", (psycopg2.Binary(binary_data),))

conn.commit()
cursor.close()
conn.close()

print('done')
