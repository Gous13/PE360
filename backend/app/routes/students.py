from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Student, AuditLog, User
from .. import db
import openpyxl
from openpyxl import Workbook
import io

students_bp = Blueprint('students', __name__)


@students_bp.route('', methods=['GET'])
@jwt_required()
def get_students():
    cls = request.args.get('class', '')
    section = request.args.get('section', '')

    query = Student.query
    if cls:
        query = query.filter_by(class_name=cls)
    if section:
        query = query.filter_by(section=section)

    students = query.order_by(
        Student.class_name, Student.section,
        Student.roll_no.cast(db.Integer) if False else Student.roll_no
    ).all()

    # Try numeric sort
    try:
        students = sorted(students, key=lambda s: int(s.roll_no))
    except (ValueError, TypeError):
        students = sorted(students, key=lambda s: s.roll_no)

    return jsonify({'students': [s.to_dict() for s in students]}), 200


@students_bp.route('/classes', methods=['GET'])
@jwt_required()
def get_classes():
    from sqlalchemy import func
    results = db.session.query(
        Student.class_name,
        func.count(Student.id).label('count')
    ).group_by(Student.class_name).all()

    classes = [{'class': r.class_name, 'count': r.count} for r in results]
    total = sum(c['count'] for c in classes)
    return jsonify({'classes': classes, 'total': total}), 200


@students_bp.route('/import', methods=['POST'])
@jwt_required()
def import_students():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

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

            # Check duplicate
            existing = Student.query.filter_by(
                roll_no=roll_no, class_name=cls, section=section
            ).first()

            if existing:
                existing.name = name
                existing.gender = gender
            else:
                student = Student(
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
    student = Student.query.get_or_404(student_id)
    db.session.delete(student)
    db.session.commit()
    return jsonify({'message': 'Student removed'}), 200


@students_bp.route('', methods=['DELETE'])
@jwt_required()
def delete_by_class():
    cls = request.args.get('class')
    section = request.args.get('section')

    if not cls or not section:
        return jsonify({'error': 'class and section required'}), 400

    Student.query.filter_by(class_name=cls, section=section).delete()
    db.session.commit()
    return jsonify({'message': f'Class {cls}-{section} cleared'}), 200
