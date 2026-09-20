from flask import Flask, jsonify
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
        'DATABASE_URL', 'sqlite:///pe360.db'
    ).replace('postgres://', 'postgresql://')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

    db.init_app(app)
    jwt.init_app(app)

    # Handle CORS manually — most reliable approach
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
        return response

    # Handle preflight OPTIONS requests for ALL routes
    @app.before_request
    def handle_preflight():
        from flask import request, Response
        if request.method == 'OPTIONS':
            res = Response()
            res.headers['Access-Control-Allow-Origin'] = '*'
            res.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            res.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
            res.status_code = 200
            return res

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

    @app.route('/health')
    def health():
        return jsonify({'status': 'ok', 'app': 'PE360'}), 200

    @app.route('/')
    def index():
        rules = [str(r) for r in app.url_map.iter_rules()]
        return jsonify({
            'status': 'ok',
            'app': 'PE360 API',
            'version': '1.0.0',
            'total_routes': len(rules),
            'has_login': '/api/auth/login' in rules
        }), 200

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
