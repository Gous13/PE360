from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import AuditLog, User
from .. import db

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('', methods=['GET'])
@jwt_required()
def get_logs():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'logs': [l.to_dict() for l in logs.items],
        'total': logs.total,
        'pages': logs.pages,
        'page': page
    }), 200
