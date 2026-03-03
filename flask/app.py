from flask import Flask
from config import Config
from models import db
from routes.main import main_bp
from routes.interview import interview_bp
from routes.history import history_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    app.register_blueprint(main_bp)
    app.register_blueprint(interview_bp)
    app.register_blueprint(history_bp)

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
