from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from ..models import User, AuditLog, Student, TimetableEntry, AttendanceSession, AttendanceRecord, ImportantItem
from .. import db

users_bp = Blueprint('users', __name__)


def require_admin():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user or user.role != 'admin':
        return None, (jsonify({'error': 'Admin access required'}), 403)
    return user, None


@users_bp.route('', methods=['GET'])
@jwt_required()
def get_users():
    current_user, err = require_admin()
    if err:
        return err

    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({'users': [u.to_dict() for u in users]}), 200


@users_bp.route('', methods=['POST'])
@jwt_required()
def create_user():
    current_user, err = require_admin()
    if err:
        return err

    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'user')
    status = data.get('status', 'active')
    school_name = data.get('schoolName', '').strip()
    phone = data.get('phone', '').strip()

    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password are required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'A user with this email already exists'}), 409

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    new_user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
        status=status,
        school_name=school_name,
        phone=phone,
    )
    db.session.add(new_user)

    log = AuditLog(user_id=current_user.id, user_name=current_user.name,
                   action='CREATE_USER', details=f'Created user: {name} ({email})')
    db.session.add(log)
    db.session.commit()

    return jsonify({'user': new_user.to_dict()}), 201


@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user, err = require_admin()
    if err:
        return err

    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if 'name' in data:
        user.name = data['name'].strip()
    if 'email' in data:
        existing = User.query.filter_by(email=data['email'].strip().lower()).first()
        if existing and existing.id != user_id:
            return jsonify({'error': 'Email already in use'}), 409
        user.email = data['email'].strip().lower()
    if 'role' in data:
        user.role = data['role']
    if 'status' in data:
        user.status = data['status']
    if 'schoolName' in data:
        user.school_name = data['schoolName'].strip()
    if 'phone' in data:
        user.phone = data['phone'].strip()
    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        user.password_hash = generate_password_hash(data['password'])

    log = AuditLog(user_id=current_user.id, user_name=current_user.name,
                   action='UPDATE_USER', details=f'Updated user: {user.name}')
    db.session.add(log)
    db.session.commit()

    return jsonify({'user': user.to_dict()}), 200


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user, err = require_admin()
    if err:
        return err

    if current_user.id == user_id:
        return jsonify({'error': 'You cannot delete your own account'}), 400

    user = User.query.get_or_404(user_id)

    # Safe cascade: delete user's private data but preserve global/shared data
    # 1. Delete attendance records for this user's sessions
    sessions = AttendanceSession.query.filter_by(user_id=user_id).all()
    for s in sessions:
        AttendanceRecord.query.filter_by(session_id=s.id).delete()
    AttendanceSession.query.filter_by(user_id=user_id).delete()

    # 2. Delete user's students
    Student.query.filter_by(user_id=user_id).delete()

    # 3. Delete user's timetable entries
    TimetableEntry.query.filter_by(user_id=user_id).delete()

    # 4. Delete user's private important items (NOT global ones — those stay for all users)
    ImportantItem.query.filter_by(created_by=user_id, is_global=False).delete()

    # 5. Now delete the user
    log = AuditLog(user_id=current_user.id, user_name=current_user.name,
                   action='DELETE_USER', details=f'Deleted user: {user.name} ({user.email})')
    db.session.add(log)

    db.session.delete(user)
    db.session.commit()

    return jsonify({'message': 'User and their school data deleted successfully'}), 200


@users_bp.route('/<int:user_id>/toggle-status', methods=['PATCH'])
@jwt_required()
def toggle_status(user_id):
    current_user, err = require_admin()
    if err:
        return err

    if current_user.id == user_id:
        return jsonify({'error': 'You cannot deactivate your own account'}), 400

    user = User.query.get_or_404(user_id)
    user.status = 'inactive' if user.status == 'active' else 'active'

    log = AuditLog(user_id=current_user.id, user_name=current_user.name,
                   action='TOGGLE_USER_STATUS', details=f'Changed {user.name} status to {user.status}')
    db.session.add(log)
    db.session.commit()

    return jsonify({'user': user.to_dict()}), 200


# ── Profile update (any authenticated user can update their own school info) ──
@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()

    if 'schoolName' in data:
        user.school_name = data['schoolName'].strip()
    if 'phone' in data:
        user.phone = data['phone'].strip()
    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()

    db.session.commit()
    return jsonify({'user': user.to_dict()}), 200
