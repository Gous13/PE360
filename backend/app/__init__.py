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
            'status': 'ok', 'app': 'PE360 API', 'version': '1.0.0',
            'total_routes': len(rules),
            'has_login': '/api/auth/login' in rules,
        }), 200

    return app


def _col_exists_pg(conn, table, col):
    """PostgreSQL: query information_schema directly — always accurate."""
    from sqlalchemy import text
    r = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_name = :t AND column_name = :c"
    ), {'t': table, 'c': col}).scalar()
    return r > 0


def _col_exists_sqlite(conn, table, col):
    """SQLite: use PRAGMA."""
    from sqlalchemy import text
    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return col in [r[1] for r in rows]


def _run_migrations():
    """
    Safe, idempotent migrations. Each statement is individually wrapped.
    Uses information_schema for PostgreSQL (always accurate, no caching issues).
    Uses PRAGMA for SQLite.
    """
    from sqlalchemy import text

    engine = db.engine
    is_pg = engine.dialect.name == 'postgresql'

    def col_exists(conn, table, col):
        try:
            if is_pg:
                return _col_exists_pg(conn, table, col)
            return _col_exists_sqlite(conn, table, col)
        except Exception:
            return False

    def safe_exec(conn, sql, label):
        try:
            conn.execute(text(sql))
            print(f'[PE360] migration OK: {label}', file=sys.stderr)
        except Exception as e:
            print(f'[PE360] migration skip ({label}): {e}', file=sys.stderr)

    # Each column gets its own transaction so one failure never blocks others
    def add_column(table, col, col_def):
        try:
            with engine.begin() as conn:
                if not col_exists(conn, table, col):
                    conn.execute(text(
                        f'ALTER TABLE {table} ADD COLUMN {col} {col_def}'
                    ))
                    print(f'[PE360] added {table}.{col}', file=sys.stderr)
        except Exception as e:
            print(f'[PE360] add_column {table}.{col} failed: {e}', file=sys.stderr)

    # ── Add columns ──────────────────────────────────────────────────────────
    add_column('users', 'school_name', "VARCHAR(200) DEFAULT ''")
    add_column('users', 'phone',       "VARCHAR(30)  DEFAULT ''")
    add_column('students',           'user_id', 'INTEGER')
    add_column('timetable_entries',  'user_id', 'INTEGER')
    add_column('attendance_sessions','user_id', 'INTEGER')
    add_column('important_items',    'is_global',
               'BOOLEAN DEFAULT FALSE' if is_pg else 'BOOLEAN DEFAULT 0')

    # ── Back-fill user_id with first admin ───────────────────────────────────
    try:
        with engine.begin() as conn:
            row = conn.execute(text(
                "SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1"
            )).fetchone()
            if not row:
                row = conn.execute(text(
                    "SELECT id FROM users ORDER BY id LIMIT 1"
                )).fetchone()
            uid = row[0] if row else 1

            safe_exec(conn,
                f"UPDATE students SET user_id = {uid} WHERE user_id IS NULL",
                'backfill students.user_id')
            safe_exec(conn,
                f"UPDATE timetable_entries "
                f"SET user_id = COALESCE(created_by, {uid}) WHERE user_id IS NULL",
                'backfill timetable_entries.user_id')
            safe_exec(conn,
                f"UPDATE attendance_sessions "
                f"SET user_id = COALESCE(teacher_id, {uid}) WHERE user_id IS NULL",
                'backfill attendance_sessions.user_id')
    except Exception as e:
        print(f'[PE360] backfill failed: {e}', file=sys.stderr)

    # ── Students unique constraint per user ──────────────────────────────────
    if is_pg:
        try:
            with engine.begin() as conn:
                # Check if new constraint already exists
                r = conn.execute(text(
                    "SELECT COUNT(*) FROM information_schema.table_constraints "
                    "WHERE constraint_name='uq_student_user_roll_class_section'"
                )).scalar()
                if r == 0:
                    safe_exec(conn,
                        "ALTER TABLE students DROP CONSTRAINT IF EXISTS "
                        "uq_student_roll_class_section",
                        'drop old constraint')
                    safe_exec(conn,
                        "ALTER TABLE students ADD CONSTRAINT "
                        "uq_student_user_roll_class_section "
                        "UNIQUE (user_id, roll_no, class_name, section)",
                        'add new constraint')
        except Exception as e:
            print(f'[PE360] constraint migration failed: {e}', file=sys.stderr)


def _seed_default_data():
    from .models import User
    from werkzeug.security import generate_password_hash

    if User.query.count() == 0:
        db.session.add_all([
            User(name='Admin User', email='admin@pe360.com',
                 password_hash=generate_password_hash('admin123'),
                 role='admin', status='active'),
            User(name='PE Teacher', email='teacher@pe360.com',
                 password_hash=generate_password_hash('teacher123'),
                 role='user', status='active'),
        ])
        db.session.commit()
