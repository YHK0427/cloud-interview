import os


class Config:
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_PORT = os.environ.get('MYSQL_PORT', '3306')
    MYSQL_USER = 'root'
    MYSQL_PASSWORD = os.environ.get('MYSQL_ROOT_PASSWORD', 'root')
    MYSQL_DB = os.environ.get('MYSQL_DATABASE', 'interview_db')

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
        f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
