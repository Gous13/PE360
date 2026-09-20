from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Student, AuditLog, User
from .. import db
import openpyxl
from openpyxl import Workbook
import io

students_bp = Blueprint('students', __name__)


def _get_user(user_id):
    return User.query.get(int(user_id))


def _base_query(user):
    """Return a student query scoped to the authenticated user.
    Admin can pass ?all=1 to see all students (for admin view-data support).
    """
    q = Student.query
    if user.role == 'admin' and request.args.get('all') == '1':
        return q  # admin sees everything when explicitly requested
    if user.role == 'admin' and request.args.get('user_id'):
        # admin viewing a specific user's data
        target_uid = int(request.args.get('user_id'))
        return q.filter_by(user_id=target_uid)
    return q.filter_by(user_id=user.id)


@students_bp.route('', methods=['GET'])
@jwt_required()
def get_students():
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404

    cls = request.args.get('class', '')
    section = request.args.get('section', '')

    query = _base_query(user)
    if cls:
        query = query.filter_by(class_name=cls)
    if section:
        query = query.filter_by(section=section)

    students = query.all()

    try:
        students = sorted(students, key=lambda s: int(s.roll_no))
    except (ValueError, TypeError):
        students = sorted(students, key=lambda s: s.roll_no)

    return jsonify({'students': [s.to_dict() for s in students]}), 200


@students_bp.route('/classes', methods=['GET'])
@jwt_required()
def get_classes():
    from sqlalchemy import func
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404

    query = db.session.query(
        Student.class_name,
        func.count(Student.id).label('count')
    )

    if user.role == 'admin' and request.args.get('all') == '1':
        pass  # no filter
    elif user.role == 'admin' and request.args.get('user_id'):
        query = query.filter(Student.user_id == int(request.args.get('user_id')))
    else:
        query = query.filter(Student.user_id == user.id)

    results = query.group_by(Student.class_name).all()
    classes = [{'class': r.class_name, 'count': r.count} for r in results]
    total = sum(c['count'] for c in classes)
    return jsonify({'classes': classes, 'total': total}), 200


@students_bp.route('/import', methods=['POST'])
@jwt_required()
def import_students():
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename or not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        return jsonify({'error': 'Invalid file type. Please upload .xlsx or .xls'}), 400

    try:
        wb = openpyxl.load_workbook(io.BytesIO(file.read()), data_only=True)
        ws = wb.active

        headers = [str(cell.value).strip() if cell.value else '' for cell in ws[1]]

        def get_col(row, names):
            for name in names:
                for i, h in enumerate(headers):
                    if h.lower() == name.lower() and i < len(row):
                        return str(row[i].value).strip() if row[i].value is not None else ''
            return ''

        imported = 0
        errors = []

        for row_idx, row in enumerate(ws.iter_rows(min_row=2), start=2):
            if all(cell.value is None for cell in row):
                continue

            roll_no = get_col(row, ['Roll No', 'rollNo', 'Roll Number', 'RollNo'])
            name = get_col(row, ['Student Name', 'Name', 'name', 'Student'])
            cls = get_col(row, ['Class', 'class', 'CLASS'])
            section = get_col(row, ['Section', 'section', 'SECTION'])
            gender = get_col(row, ['Gender', 'gender', 'GENDER']).lower() or 'male'

            if not name:
                errors.append(f'Row {row_idx}: Missing student name')
                continue
            if not roll_no:
                errors.append(f'Row {row_idx}: Missing roll number')
                continue
            if not cls:
                errors.append(f'Row {row_idx}: Missing class')
                continue
            if not section:
                errors.append(f'Row {row_idx}: Missing section')
                continue

            if gender not in ['male', 'female', 'other']:
                gender = 'male'

            # Duplicate check: scoped to this user
            existing = Student.query.filter_by(
                user_id=user.id, roll_no=roll_no, class_name=cls, section=section
            ).first()

            if existing:
                existing.name = name
                existing.gender = gender
            else:
                student = Student(
                    user_id=user.id,
                    roll_no=roll_no, name=name,
                    class_name=cls, section=section, gender=gender
                )
                db.session.add(student)
            imported += 1

        db.session.flush()
        db.session.commit()

        log = AuditLog(
            user_id=user.id, user_name=user.name,
            action='IMPORT_STUDENTS',
            details=f'Imported {imported} students'
        )
        db.session.add(log)
        db.session.commit()

        return jsonify({
            'message': f'{imported} students imported successfully',
            'imported': imported,
            'errors': errors
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500


@students_bp.route('/template', methods=['GET'])
@jwt_required()
def download_template():
    wb = Workbook()
    ws = wb.active
    ws.title = 'Students'
    ws.append(['Roll No', 'Student Name', 'Class', 'Section', 'Gender'])
    ws.append(['1', 'Rahul Kumar', '8', 'A', 'male'])
    ws.append(['2', 'Priya Sharma', '8', 'A', 'female'])
    ws.append(['3', 'Arjun Singh', '8', 'B', 'male'])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='PE360_Student_Template.xlsx'
    )


@students_bp.route('/<int:student_id>', methods=['DELETE'])
@jwt_required()
def delete_student(student_id):
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404

    student = Student.query.get_or_404(student_id)

    # Ownership check — admin can delete any student
    if user.role != 'admin' and student.user_id != user.id:
        return jsonify({'error': 'Forbidden: this student does not belong to your account'}), 403

    db.session.delete(student)
    db.session.commit()
    return jsonify({'message': 'Student removed'}), 200


@students_bp.route('', methods=['DELETE'])
@jwt_required()
def delete_by_class():
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404

    cls = request.args.get('class')
    section = request.args.get('section')

    from sqlalchemy import text

    # Check whether user_id column exists yet in production
    def _user_id_col_exists():
        try:
            engine = db.engine
            is_pg = engine.dialect.name == 'postgresql'
            with engine.connect() as c:
                if is_pg:
                    r = c.execute(text(
                        "SELECT COUNT(*) FROM information_schema.columns "
                        "WHERE table_name='students' AND column_name='user_id'"
                    )).scalar()
                    return r > 0
                else:
                    rows = c.execute(text("PRAGMA table_info(students)")).fetchall()
                    return 'user_id' in [row[1] for row in rows]
        except Exception:
            return False

    has_user_id = _user_id_col_exists()

    try:
        if not cls and not section:
            # Delete ALL students for this user
            if has_user_id:
                result = db.session.execute(text(
                    "DELETE FROM students WHERE user_id = :uid OR user_id IS NULL"
                ), {'uid': user.id})
            else:
                result = db.session.execute(text("DELETE FROM students"))
            db.session.commit()
            count = result.rowcount if result.rowcount != -1 else 0
            return jsonify({'message': f'All {count} students deleted'}), 200

        if not cls or not section:
            return jsonify({'error': 'class and section required'}), 400

        # Delete by class/section
        if has_user_id:
            db.session.execute(text(
                "DELETE FROM students WHERE class_name = :cls AND section = :sec "
                "AND (user_id = :uid OR user_id IS NULL)"
            ), {'cls': cls, 'sec': section, 'uid': user.id})
        else:
            db.session.execute(text(
                "DELETE FROM students WHERE class_name = :cls AND section = :sec"
            ), {'cls': cls, 'sec': section})

        db.session.commit()
        return jsonify({'message': f'Class {cls}-{section} cleared'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Delete failed: {str(e)}'}), 500


# ── Admin: list users with their student counts ────────────────────────────
@students_bp.route('/admin/summary', methods=['GET'])
@jwt_required()
def admin_summary():
    user = _get_user(get_jwt_identity())
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    from sqlalchemy import func
    results = db.session.query(
        Student.user_id,
        func.count(Student.id).label('count')
    ).group_by(Student.user_id).all()

    summary = {r.user_id: r.count for r in results}
    users = User.query.order_by(User.created_at).all()

    data = []
    for u in users:
        data.append({
            'userId': u.id,
            'userName': u.name,
            'email': u.email,
            'schoolName': u.school_name or '',
            'role': u.role,
            'status': u.status,
            'studentCount': summary.get(u.id, 0),
        })

    return jsonify({'summary': data}), 200
