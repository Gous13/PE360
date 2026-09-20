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
        _run_migrations()
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


def _run_migrations():
    """Run safe schema migrations for multi-user isolation."""
    from sqlalchemy import text

    def col_exists(conn, table, col):
        try:
            result = conn.execute(text(f"PRAGMA table_info({table})"))
            return col in [r[1] for r in result.fetchall()]
        except Exception:
            return False

    def idx_exists(conn, idx):
        try:
            r = conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='index' AND name=:n"
            ), {"n": idx})
            return r.fetchone() is not None
        except Exception:
            return False

    conn = db.engine.connect()
    trans = conn.begin()
    try:
        # Get default user (first admin, or first user)
        row = conn.execute(text("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1")).fetchone()
        if not row:
            row = conn.execute(text("SELECT id FROM users ORDER BY id LIMIT 1")).fetchone()
        uid = row[0] if row else 1

        # users: school_name, phone
        if not col_exists(conn, 'users', 'school_name'):
            conn.execute(text("ALTER TABLE users ADD COLUMN school_name VARCHAR(200) DEFAULT ''"))
        if not col_exists(conn, 'users', 'phone'):
            conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(30) DEFAULT ''"))

        # students: user_id + recreate with new unique constraint
        if not col_exists(conn, 'students', 'user_id'):
            conn.execute(text("ALTER TABLE students ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            conn.execute(text(f"UPDATE students SET user_id={uid} WHERE user_id IS NULL"))

        if not idx_exists(conn, 'uq_student_user_roll_class_section'):
            conn.execute(text("""
                CREATE TABLE students_new (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    roll_no VARCHAR(20) NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    class_name VARCHAR(10) NOT NULL,
                    section VARCHAR(5) NOT NULL,
                    gender VARCHAR(10) DEFAULT 'male',
                    created_at DATETIME,
                    UNIQUE(user_id, roll_no, class_name, section)
                )
            """))
            conn.execute(text("""
                INSERT OR IGNORE INTO students_new
                    (id, user_id, roll_no, name, class_name, section, gender, created_at)
                SELECT id, user_id, roll_no, name, class_name, section, gender, created_at
                FROM students
            """))
            conn.execute(text("DROP TABLE students"))
            conn.execute(text("ALTER TABLE students_new RENAME TO students"))

        # timetable_entries: user_id
        if not col_exists(conn, 'timetable_entries', 'user_id'):
            conn.execute(text("ALTER TABLE timetable_entries ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            conn.execute(text(f"""
                UPDATE timetable_entries SET user_id=COALESCE(created_by,{uid}) WHERE user_id IS NULL
            """))

        # attendance_sessions: user_id
        if not col_exists(conn, 'attendance_sessions', 'user_id'):
            conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            conn.execute(text(f"""
                UPDATE attendance_sessions SET user_id=COALESCE(teacher_id,{uid}) WHERE user_id IS NULL
            """))

        # important_items: is_global
        if not col_exists(conn, 'important_items', 'is_global'):
            conn.execute(text("ALTER TABLE important_items ADD COLUMN is_global BOOLEAN DEFAULT 0"))

        trans.commit()
    except Exception:
        trans.rollback()
    finally:
        conn.close()


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
