from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import AttendanceSession, AttendanceRecord, Student, User, AuditLog
from .. import db
from datetime import datetime
import io

attendance_bp = Blueprint('attendance', __name__)


@attendance_bp.route('/sessions', methods=['POST'])
@jwt_required()
def save_session():
    user_id = get_jwt_identity()
    data = request.get_json()

    date = data.get('date')
    class_name = data.get('class')
    section = data.get('section')
    period = int(data.get('period', 1))
    subject = data.get('subject', 'Physical Education')
    records = data.get('records', [])

    if not date or not class_name or not section:
        return jsonify({'error': 'date, class, and section are required'}), 400

    # Find or create session
    session = AttendanceSession.query.filter_by(
        date=date, class_name=class_name, section=section, period=period
    ).first()

    if session:
        AttendanceRecord.query.filter_by(session_id=session.id).delete()
    else:
        session = AttendanceSession(
            date=date, class_name=class_name, section=section,
            period=period, subject=subject, teacher_id=int(user_id)
        )
        db.session.add(session)
        db.session.flush()

    for rec in records:
        student_id = rec.get('studentId')
        status = rec.get('status', 'present')
        if student_id:
            record = AttendanceRecord(
                session_id=session.id,
                student_id=student_id,
                status=status
            )
            db.session.add(record)

    user = User.query.get(int(user_id))
    present_count = sum(1 for r in records if r.get('status') == 'present')
    log = AuditLog(
        user_id=int(user_id), user_name=user.name if user else 'Unknown',
        action='SAVE_ATTENDANCE',
        details=f'Marked attendance for {class_name}-{section} on {date}: {present_count}/{len(records)} present'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': 'Attendance saved', 'sessionId': session.id}), 200


@attendance_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    cls = request.args.get('class')
    section = request.args.get('section')
    date = request.args.get('date')

    query = AttendanceSession.query
    if cls: query = query.filter_by(class_name=cls)
    if section: query = query.filter_by(section=section)
    if date: query = query.filter_by(date=date)

    sessions = query.order_by(AttendanceSession.date.desc()).limit(50).all()
    return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200


@attendance_bp.route('/sessions/<int:session_id>', methods=['GET'])
@jwt_required()
def get_session(session_id):
    session = AttendanceSession.query.get_or_404(session_id)
    return jsonify({'session': session.to_dict(include_records=True)}), 200


@attendance_bp.route('/monthly', methods=['GET'])
@jwt_required()
def get_monthly():
    cls = request.args.get('class')
    section = request.args.get('section')
    month = request.args.get('month')  # YYYY-MM

    if not cls or not section or not month:
        return jsonify({'error': 'class, section, and month are required'}), 400

    sessions = AttendanceSession.query.filter(
        AttendanceSession.class_name == cls,
        AttendanceSession.section == section,
        AttendanceSession.date.like(f'{month}%')
    ).all()

    students = Student.query.filter_by(class_name=cls, section=section).all()

    # Calculate per-student stats
    student_stats = []
    for student in students:
        present = 0
        absent = 0
        for session in sessions:
            record = next((r for r in session.records if r.student_id == student.id), None)
            if record:
                if record.status == 'present':
                    present += 1
                else:
                    absent += 1

        total = present + absent
        percentage = round((present / total * 100), 1) if total > 0 else 0
        student_stats.append({
            'studentId': student.id,
            'rollNo': student.roll_no,
            'name': student.name,
            'present': present,
            'absent': absent,
            'total': total,
            'percentage': percentage
        })

    try:
        student_stats = sorted(student_stats, key=lambda s: int(s['rollNo']))
    except (ValueError, TypeError):
        student_stats = sorted(student_stats, key=lambda s: s['rollNo'])

    total_students = len(students)
    avg_attendance = 0
    if student_stats:
        avg_attendance = round(sum(s['percentage'] for s in student_stats) / len(student_stats), 1)

    return jsonify({
        'class': cls,
        'section': section,
        'month': month,
        'totalSessions': len(sessions),
        'totalStudents': total_students,
        'avgAttendance': avg_attendance,
        'students': student_stats
    }), 200


@attendance_bp.route('/pdf', methods=['GET'])
@jwt_required()
def generate_pdf():
    cls = request.args.get('class')
    section = request.args.get('section')
    month = request.args.get('month')

    if not cls or not section or not month:
        return jsonify({'error': 'class, section, and month are required'}), 400

    sessions = AttendanceSession.query.filter(
        AttendanceSession.class_name == cls,
        AttendanceSession.section == section,
        AttendanceSession.date.like(f'{month}%')
    ).order_by(AttendanceSession.date).all()

    students = Student.query.filter_by(class_name=cls, section=section).all()
    try:
        students = sorted(students, key=lambda s: int(s.roll_no))
    except (ValueError, TypeError):
        students = sorted(students, key=lambda s: s.roll_no)

    try:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.units import cm

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4),
                                rightMargin=1*cm, leftMargin=1*cm,
                                topMargin=1.5*cm, bottomMargin=1.5*cm)
        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = ParagraphStyle('title', parent=styles['Heading1'], alignment=1, fontSize=16, spaceAfter=4)
        story.append(Paragraph("PE360 — Physical Education Attendance Report", title_style))

        sub_style = ParagraphStyle('sub', parent=styles['Normal'], alignment=1, fontSize=11, spaceAfter=12)
        year, mon = month.split('-')
        month_names = ['','January','February','March','April','May','June','July','August','September','October','November','December']
        month_name = month_names[int(mon)]
        story.append(Paragraph(f"Class: {cls}-{section} | Month: {month_name} {year}", sub_style))

        if not sessions:
            story.append(Paragraph("No attendance sessions found for this period.", styles['Normal']))
        else:
            # Build table
            dates = [s.date.split('-')[2] for s in sessions]
            header = ['Roll', 'Student Name'] + dates + ['Present', 'Absent', '%']
            data = [header]

            for student in students:
                row = [student.roll_no, student.name]
                present = 0
                absent = 0
                for session in sessions:
                    record = next((r for r in session.records if r.student_id == student.id), None)
                    if record:
                        if record.status == 'present':
                            row.append('P')
                            present += 1
                        else:
                            row.append('A')
                            absent += 1
                    else:
                        row.append('-')
                total = present + absent
                pct = f"{round(present/total*100,1)}%" if total > 0 else '-'
                row.extend([present, absent, pct])
                data.append(row)

            col_widths = [1.5*cm, 5*cm] + [0.7*cm]*len(sessions) + [1.5*cm, 1.5*cm, 1.5*cm]

            table = Table(data, colWidths=col_widths, repeatRows=1)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (1, 1), (1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('BACKGROUND', (-3, 1), (-3, -1), colors.HexColor('#dcfce7')),
                ('BACKGROUND', (-2, 1), (-2, -1), colors.HexColor('#fee2e2')),
                ('PADDING', (0, 0), (-1, -1), 3),
            ]))

            # Color A/P cells
            for row_i, student in enumerate(students, start=1):
                for col_i, session in enumerate(sessions, start=2):
                    record = next((r for r in session.records if r.student_id == student.id), None)
                    if record:
                        color = colors.HexColor('#dcfce7') if record.status == 'present' else colors.HexColor('#fee2e2')
                        table.setStyle(TableStyle([
                            ('BACKGROUND', (col_i, row_i), (col_i, row_i), color),
                        ]))

            story.append(table)

        story.append(Spacer(1, 0.5*cm))
        footer_style = ParagraphStyle('footer', parent=styles['Normal'], fontSize=9, textColor=colors.grey)
        story.append(Paragraph(f"Generated by PE360 on {datetime.now().strftime('%d %B %Y')}", footer_style))

        doc.build(story)
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=False,
            download_name=f'Attendance_{cls}-{section}_{month}.pdf'
        )

    except ImportError:
        return jsonify({'error': 'PDF generation library not available'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to generate PDF: {str(e)}'}), 500
