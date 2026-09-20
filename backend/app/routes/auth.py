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
    """Update the currently authenticated user's own profile.
    Uses JWT identity — never trusts a user_id from the request body.
    """
    from ..models import User
    from .. import db

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    user.name = name

    if 'schoolName' in data:
        user.school_name = (data['schoolName'] or '').strip()
    if 'phone' in data:
        user.phone = (data['phone'] or '').strip()

    db.session.commit()
    return jsonify({'user': user.to_dict()}), 200
