from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from ..models import User, AuditLog
from .. import db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter(
        (User.email == email) | (User.email == data.get('email', '').strip())
    ).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password'}), 401

    if user.status != 'active':
        return jsonify({'error': 'Your account has been deactivated. Contact admin.'}), 403

    token = create_access_token(identity=str(user.id))

    log = AuditLog(user_id=user.id, user_name=user.name, action='LOGIN', details=f'User logged in from {request.remote_addr}')
    db.session.add(log)
    db.session.commit()

    return jsonify({'token': token, 'user': user.to_dict()}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()}), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    old_password = data.get('oldPassword', '')
    new_password = data.get('newPassword', '')

    if not old_password or not new_password:
        return jsonify({'error': 'Both passwords are required'}), 400

    if not check_password_hash(user.password_hash, old_password):
        return jsonify({'error': 'Current password is incorrect'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    user.password_hash = generate_password_hash(new_password)
    log = AuditLog(user_id=user.id, user_name=user.name, action='CHANGE_PASSWORD', details='User changed their password')
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': 'Password changed successfully'}), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update own profile using raw SQL — works even if new columns
    don't exist yet (gracefully skips missing columns)."""
    from sqlalchemy import text

    user_id = int(get_jwt_identity())

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    school_name = (data.get('schoolName') or '').strip()
    phone = (data.get('phone') or '').strip()

    is_pg = db.engine.dialect.name == 'postgresql'

    # Detect which columns actually exist right now
    def col_exists(col):
        try:
            with db.engine.connect() as c:
                if is_pg:
                    r = c.execute(text(
                        "SELECT COUNT(*) FROM information_schema.columns "
                        "WHERE table_name='users' AND column_name=:c"
                    ), {'c': col}).scalar()
                    return r > 0
                else:
                    rows = c.execute(text("PRAGMA table_info(users)")).fetchall()
                    return col in [row[1] for row in rows]
        except Exception:
            return False

    has_school = col_exists('school_name')
    has_phone  = col_exists('phone')

    # Build UPDATE dynamically based on existing columns
    set_parts = ['name = :name']
    params = {'name': name, 'uid': user_id}

    if has_school:
        set_parts.append('school_name = :school_name')
        params['school_name'] = school_name

    if has_phone:
        set_parts.append('phone = :phone')
        params['phone'] = phone

    sql = f"UPDATE users SET {', '.join(set_parts)} WHERE id = :uid"

    try:
        with db.engine.begin() as conn:
            conn.execute(text(sql), params)
    except Exception as e:
        return jsonify({'error': f'Update failed: {str(e)}'}), 500

    # Read back the updated user with raw SQL
    try:
        with db.engine.connect() as conn:
            if is_pg:
                cols = conn.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='users' ORDER BY ordinal_position"
                )).fetchall()
                col_names = [r[0] for r in cols]
            else:
                rows = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                col_names = [r[1] for r in rows]

            row = conn.execute(
                text("SELECT * FROM users WHERE id = :uid"), {'uid': user_id}
            ).fetchone()

            if not row:
                return jsonify({'error': 'User not found'}), 404

            row_dict = dict(zip(col_names, row))
            user_data = {
                'id':         row_dict.get('id'),
                'name':       row_dict.get('name', ''),
                'email':      row_dict.get('email', ''),
                'role':       row_dict.get('role', 'user'),
                'status':     row_dict.get('status', 'active'),
                'schoolName': row_dict.get('school_name', ''),
                'phone':      row_dict.get('phone', ''),
                'createdAt':  str(row_dict.get('created_at', '')),
            }
    except Exception as e:
        return jsonify({'error': f'Read-back failed: {str(e)}'}), 500

    return jsonify({'user': user_data}), 200
