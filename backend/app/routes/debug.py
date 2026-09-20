from flask import Blueprint, jsonify
from .. import db
from sqlalchemy import text

debug_bp = Blueprint('debug', __name__)


@debug_bp.route('/schema', methods=['GET'])
def check_schema():
    """Diagnostic endpoint — shows actual column names in production DB."""
    result = {}
    tables = ['users', 'students', 'timetable_entries', 'attendance_sessions', 'important_items']
    try:
        with db.engine.connect() as conn:
            is_pg = db.engine.dialect.name == 'postgresql'
            for table in tables:
                try:
                    if is_pg:
                        rows = conn.execute(text(
                            "SELECT column_name FROM information_schema.columns "
                            "WHERE table_name = :t ORDER BY ordinal_position"
                        ), {'t': table}).fetchall()
                        result[table] = [r[0] for r in rows]
                    else:
                        rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
                        result[table] = [r[1] for r in rows]
                except Exception as e:
                    result[table] = f'ERROR: {e}'
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({
        'dialect': db.engine.dialect.name,
        'schema': result
    }), 200


@debug_bp.route('/migrate-now', methods=['POST'])
def force_migrate():
    """Force-run all migrations and return what happened."""
    from .. import _run_migrations
    import sys
    import io

    # Capture stderr output
    old_stderr = sys.stderr
    sys.stderr = buf = io.StringIO()
    try:
        _run_migrations()
    finally:
        sys.stderr = old_stderr

    output = buf.getvalue()

    # Verify what columns exist now
    schema = {}
    tables = ['users', 'students']
    try:
        with db.engine.connect() as conn:
            is_pg = db.engine.dialect.name == 'postgresql'
            for table in tables:
                if is_pg:
                    rows = conn.execute(text(
                        "SELECT column_name FROM information_schema.columns "
                        "WHERE table_name = :t"
                    ), {'t': table}).fetchall()
                    schema[table] = [r[0] for r in rows]
                else:
                    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
                    schema[table] = [r[1] for r in rows]
    except Exception as e:
        schema['error'] = str(e)

    return jsonify({
        'migration_log': output,
        'schema_after': schema
    }), 200
