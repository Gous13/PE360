from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from ..models import TimetableEntry, User
from .. import db

timetable_bp = Blueprint('timetable', __name__)

DAY_MAP = {0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday', 4: 'Friday', 5: 'Saturday', 6: 'Sunday'}


def _get_user(user_id):
    return User.query.get(int(user_id))


def _scoped_query(user):
    q = TimetableEntry.query
    if user.role == 'admin' and request.args.get('user_id'):
        return q.filter_by(user_id=int(request.args.get('user_id')))
    return q.filter_by(user_id=user.id)


@timetable_bp.route('', methods=['GET'])
@jwt_required()
def get_all():
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404
    entries = _scoped_query(user).order_by(TimetableEntry.day, TimetableEntry.period).all()
    return jsonify({'entries': [e.to_dict() for e in entries]}), 200


@timetable_bp.route('/today', methods=['GET'])
@jwt_required()
def get_today():
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404
    today_name = DAY_MAP.get(datetime.now().weekday(), 'Monday')
    entries = _scoped_query(user).filter_by(day=today_name).order_by(TimetableEntry.period).all()
    return jsonify({'entries': [e.to_dict() for e in entries], 'day': today_name}), 200


@timetable_bp.route('', methods=['POST'])
@jwt_required()
def create_entry():
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404
    data = request.get_json()

    if not data.get('day') or not data.get('class') or not data.get('section'):
        return jsonify({'error': 'Day, class, and section are required'}), 400

    if not data.get('teacherName', '').strip():
        return jsonify({'error': 'Teacher name is required'}), 400

    entry = TimetableEntry(
        user_id=user.id,
        day=data['day'],
        period=int(data.get('period', 1)),
        class_name=data['class'],
        section=data['section'],
        time=data.get('time', '09:00'),
        subject=data.get('subject', 'Physical Education'),
        teacher_name=data['teacherName'],
        created_by=user.id
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify({'entry': entry.to_dict()}), 201


@timetable_bp.route('/<int:entry_id>', methods=['PUT'])
@jwt_required()
def update_entry(entry_id):
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404

    entry = TimetableEntry.query.get_or_404(entry_id)

    if user.role != 'admin' and entry.user_id != user.id:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()
    if 'day' in data: entry.day = data['day']
    if 'period' in data: entry.period = int(data['period'])
    if 'class' in data: entry.class_name = data['class']
    if 'section' in data: entry.section = data['section']
    if 'time' in data: entry.time = data['time']
    if 'subject' in data: entry.subject = data['subject']
    if 'teacherName' in data: entry.teacher_name = data['teacherName']

    db.session.commit()
    return jsonify({'entry': entry.to_dict()}), 200


@timetable_bp.route('/<int:entry_id>', methods=['DELETE'])
@jwt_required()
def delete_entry(entry_id):
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404

    entry = TimetableEntry.query.get_or_404(entry_id)

    if user.role != 'admin' and entry.user_id != user.id:
        return jsonify({'error': 'Forbidden'}), 403

    db.session.delete(entry)
    db.session.commit()
    return jsonify({'message': 'Period deleted'}), 200
