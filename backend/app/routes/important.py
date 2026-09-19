from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import ImportantItem, AuditLog, User
from .. import db

important_bp = Blueprint('important', __name__)


@important_bp.route('', methods=['GET'])
@jwt_required()
def get_all():
    items = ImportantItem.query.order_by(
        ImportantItem.pinned.desc(),
        ImportantItem.created_at.desc()
    ).all()
    return jsonify({'items': [i.to_dict() for i in items]}), 200


@important_bp.route('', methods=['POST'])
@jwt_required()
def create_item():
    user_id = get_jwt_identity()
    data = request.get_json()

    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    item = ImportantItem(
        title=title,
        description=data.get('description', ''),
        category=data.get('category', 'General'),
        date=data.get('date'),
        priority=data.get('priority', 'medium'),
        pinned=bool(data.get('pinned', False)),
        created_by=int(user_id)
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({'item': item.to_dict()}), 201


@important_bp.route('/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_item(item_id):
    item = ImportantItem.query.get_or_404(item_id)
    data = request.get_json()

    if 'title' in data:
        item.title = data['title'].strip()
    if 'description' in data:
        item.description = data['description']
    if 'category' in data:
        item.category = data['category']
    if 'date' in data:
        item.date = data['date']
    if 'priority' in data:
        item.priority = data['priority']
    if 'pinned' in data:
        item.pinned = bool(data['pinned'])

    db.session.commit()
    return jsonify({'item': item.to_dict()}), 200


@important_bp.route('/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_item(item_id):
    item = ImportantItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item deleted'}), 200


@important_bp.route('/<int:item_id>/pin', methods=['PATCH'])
@jwt_required()
def toggle_pin(item_id):
    item = ImportantItem.query.get_or_404(item_id)
    item.pinned = not item.pinned
    db.session.commit()
    return jsonify({'item': item.to_dict()}), 200
