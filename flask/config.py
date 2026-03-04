import os


class Config:
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_PORT = os.environ.get('MYSQL_PORT', '3306')
    MYSQL_USER = os.environ.get('MYSQL_USER', 'interview')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'interview')
    MYSQL_DB = os.environ.get('MYSQL_DATABASE', 'interview_db')

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
        f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
    _key_file = os.environ.get('GEMINI_API_KEY_FILE', '')
    if _key_file:
        with open(_key_file, 'r') as f:
            GEMINI_API_KEY = f.read().strip()
