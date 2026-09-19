from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from datetime import timedelta
import os

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # Config
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'pe360-secret-key-change-in-production')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'pe360-jwt-secret-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL',
        'sqlite:///pe360.db'
    ).replace('postgres://', 'postgresql://')  # Fix for Railway/Heroku
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

    db.init_app(app)
    jwt.init_app(app)

    CORS(app, resources={r"/api/*": {
        "origins": [
            "http://localhost:5173",
            "http://localhost:4173",
            os.getenv("FRONTEND_URL", "*"),
        ]
    }})

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.users import users_bp
    from .routes.students import students_bp
    from .routes.timetable import timetable_bp
    from .routes.attendance import attendance_bp
    from .routes.important import important_bp
    from .routes.audit import audit_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(students_bp, url_prefix='/api/students')
    app.register_blueprint(timetable_bp, url_prefix='/api/timetable')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(important_bp, url_prefix='/api/important')
    app.register_blueprint(audit_bp, url_prefix='/api/audit')

    with app.app_context():
        db.create_all()
        _seed_default_data()

    # Health check route
    @app.route('/health')
    def health():
        return {'status': 'ok', 'app': 'PE360'}, 200

    @app.route('/')
    def index():
        return {'status': 'ok', 'app': 'PE360 API', 'version': '1.0.0'}, 200

    return app


def _seed_default_data():
    from .models import User
    from werkzeug.security import generate_password_hash

    if User.query.count() == 0:
        admin = User(
            name='Admin User',
            email='admin@pe360.com',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            status='active'
        )
        teacher = User(
            name='PE Teacher',
            email='teacher@pe360.com',
            password_hash=generate_password_hash('teacher123'),
            role='user',
            status='active'
        )
        db.session.add_all([admin, teacher])
        db.session.commit()
