from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from datetime import timedelta
import os
import sys

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

    # CORS
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
        return response

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

    # Blueprints
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
            'has_login': '/api/auth/login' in rules,
        }), 200

    return app


def _safe_alter(conn, sql, label=''):
    """Execute an ALTER statement, ignoring errors if the change already exists."""
    from sqlalchemy import text
    try:
        conn.execute(text(sql))
    except Exception as e:
        print(f'[PE360 migration] {label} skipped: {e}', file=sys.stderr)


def _run_migrations():
    """
    Safe, idempotent schema migrations.
    Uses SQLAlchemy inspect() — works on both SQLite and PostgreSQL.
    Each ALTER is wrapped individually so one failure does not block the rest.
    """
    from sqlalchemy import text, inspect as sa_inspect

    engine = db.engine
    is_pg = engine.dialect.name == 'postgresql'

    def col_exists(table, col):
        try:
            insp = sa_inspect(engine)
            return col in [c['name'] for c in insp.get_columns(table)]
        except Exception:
            return False

    def idx_exists(table, idx):
        try:
            insp = sa_inspect(engine)
            return idx in [i['name'] for i in insp.get_indexes(table)]
        except Exception:
            return False

    with engine.connect() as conn:
        with conn.begin():

            # ── users: add school_name and phone ──────────────────────────
            if not col_exists('users', 'school_name'):
                _safe_alter(conn,
                    "ALTER TABLE users ADD COLUMN school_name VARCHAR(200) DEFAULT ''",
                    'add users.school_name')

            if not col_exists('users', 'phone'):
                _safe_alter(conn,
                    "ALTER TABLE users ADD COLUMN phone VARCHAR(30) DEFAULT ''",
                    'add users.phone')

            # ── find default user for orphan assignment ───────────────────
            row = conn.execute(text(
                "SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1"
            )).fetchone()
            if not row:
                row = conn.execute(text(
                    "SELECT id FROM users ORDER BY id LIMIT 1"
                )).fetchone()
            uid = row[0] if row else 1

            # ── students: add user_id ─────────────────────────────────────
            if not col_exists('students', 'user_id'):
                _safe_alter(conn,
                    "ALTER TABLE students ADD COLUMN user_id INTEGER REFERENCES users(id)",
                    'add students.user_id')
                _safe_alter(conn,
                    f"UPDATE students SET user_id = {uid} WHERE user_id IS NULL",
                    'backfill students.user_id')

            # ── students: unique constraint per user ──────────────────────
            if not idx_exists('students', 'uq_student_user_roll_class_section'):
                if is_pg:
                    # Drop old global constraint first (ignore if it doesn't exist)
                    _safe_alter(conn,
                        "ALTER TABLE students "
                        "DROP CONSTRAINT IF EXISTS uq_student_roll_class_section",
                        'drop old students constraint')
                    # Add new per-user constraint
                    _safe_alter(conn,
                        "ALTER TABLE students "
                        "ADD CONSTRAINT uq_student_user_roll_class_section "
                        "UNIQUE (user_id, roll_no, class_name, section)",
                        'add new students constraint')
                else:
                    # SQLite cannot DROP CONSTRAINT — rebuild the table
                    try:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS students_new (
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
                                (id, user_id, roll_no, name,
                                 class_name, section, gender, created_at)
                            SELECT id, user_id, roll_no, name,
                                   class_name, section, gender, created_at
                            FROM students
                        """))
                        conn.execute(text("DROP TABLE students"))
                        conn.execute(text(
                            "ALTER TABLE students_new RENAME TO students"
                        ))
                    except Exception as e:
                        print(f'[PE360 migration] SQLite students rebuild skipped: {e}',
                              file=sys.stderr)

            # ── timetable_entries: add user_id ────────────────────────────
            if not col_exists('timetable_entries', 'user_id'):
                _safe_alter(conn,
                    "ALTER TABLE timetable_entries "
                    "ADD COLUMN user_id INTEGER REFERENCES users(id)",
                    'add timetable_entries.user_id')
                _safe_alter(conn,
                    f"UPDATE timetable_entries "
                    f"SET user_id = COALESCE(created_by, {uid}) "
                    f"WHERE user_id IS NULL",
                    'backfill timetable_entries.user_id')

            # ── attendance_sessions: add user_id ──────────────────────────
            if not col_exists('attendance_sessions', 'user_id'):
                _safe_alter(conn,
                    "ALTER TABLE attendance_sessions "
                    "ADD COLUMN user_id INTEGER REFERENCES users(id)",
                    'add attendance_sessions.user_id')
                _safe_alter(conn,
                    f"UPDATE attendance_sessions "
                    f"SET user_id = COALESCE(teacher_id, {uid}) "
                    f"WHERE user_id IS NULL",
                    'backfill attendance_sessions.user_id')

            # ── important_items: add is_global ────────────────────────────
            if not col_exists('important_items', 'is_global'):
                default = 'FALSE' if is_pg else '0'
                _safe_alter(conn,
                    f"ALTER TABLE important_items "
                    f"ADD COLUMN is_global BOOLEAN DEFAULT {default}",
                    'add important_items.is_global')


def _seed_default_data():
    from .models import User
    from werkzeug.security import generate_password_hash

    if User.query.count() == 0:
        admin = User(
            name='Admin User',
            email='admin@pe360.com',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            status='active',
        )
        teacher = User(
            name='PE Teacher',
            email='teacher@pe360.com',
            password_hash=generate_password_hash('teacher123'),
            role='user',
            status='active',
        )
        db.session.add_all([admin, teacher])
        db.session.commit()
