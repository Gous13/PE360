from . import db
from datetime import datetime


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='user')  # admin, user
    status = db.Column(db.String(20), default='active')  # active, inactive
    school_name = db.Column(db.String(200), default='')
    phone = db.Column(db.String(30), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'status': self.status,
            'schoolName': self.school_name or '',
            'phone': self.phone or '',
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }


class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    roll_no = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    class_name = db.Column(db.String(10), nullable=False)
    section = db.Column(db.String(5), nullable=False)
    gender = db.Column(db.String(10), default='male')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Unique per user: same roll+class+section can exist for different PETs
    __table_args__ = (
        db.UniqueConstraint('user_id', 'roll_no', 'class_name', 'section',
                            name='uq_student_user_roll_class_section'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'rollNo': self.roll_no,
            'name': self.name,
            'class': self.class_name,
            'section': self.section,
            'gender': self.gender,
        }


class TimetableEntry(db.Model):
    __tablename__ = 'timetable_entries'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    day = db.Column(db.String(20), nullable=False)
    period = db.Column(db.Integer, nullable=False)
    class_name = db.Column(db.String(10), nullable=False)
    section = db.Column(db.String(5), nullable=False)
    time = db.Column(db.String(10), nullable=False)
    subject = db.Column(db.String(100), default='Physical Education')
    teacher_name = db.Column(db.String(100), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    def to_dict(self):
        return {
            'id': self.id,
            'day': self.day,
            'period': self.period,
            'class': self.class_name,
            'section': self.section,
            'time': self.time,
            'subject': self.subject,
            'teacherName': self.teacher_name,
        }


class AttendanceSession(db.Model):
    __tablename__ = 'attendance_sessions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    date = db.Column(db.String(20), nullable=False)
    class_name = db.Column(db.String(10), nullable=False)
    section = db.Column(db.String(5), nullable=False)
    period = db.Column(db.Integer, nullable=False)
    subject = db.Column(db.String(100), default='Physical Education')
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    records = db.relationship('AttendanceRecord', backref='session', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_records=False):
        d = {
            'id': self.id,
            'date': self.date,
            'class': self.class_name,
            'section': self.section,
            'period': self.period,
            'subject': self.subject,
        }
        if include_records:
            d['records'] = [r.to_dict() for r in self.records]
        return d


class AttendanceRecord(db.Model):
    __tablename__ = 'attendance_records'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('attendance_sessions.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    status = db.Column(db.String(10), nullable=False)  # present, absent

    student = db.relationship('Student', backref='attendance_records', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'studentId': self.student_id,
            'studentName': self.student.name if self.student else '',
            'rollNo': self.student.roll_no if self.student else '',
            'status': self.status,
        }


class ImportantItem(db.Model):
    __tablename__ = 'important_items'
    id = db.Column(db.Integer, primary_key=True)
    # is_global=True means admin created it for all users; False means private to owner
    is_global = db.Column(db.Boolean, default=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    category = db.Column(db.String(50), default='General')
    date = db.Column(db.String(20))
    priority = db.Column(db.String(10), default='medium')  # high, medium, low
    pinned = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'date': self.date,
            'priority': self.priority,
            'pinned': self.pinned,
            'createdBy': self.created_by,
            'isGlobal': self.is_global or False,
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    user_name = db.Column(db.String(100))
    action = db.Column(db.String(200))
    details = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'userName': self.user_name,
            'action': self.action,
            'details': self.details,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }
