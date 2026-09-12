from flask import Blueprint, request, jsonify
from ..database import get_db
from ..utils.auth import login_required

bp = Blueprint('menu', __name__, url_prefix='/api/menu')

@bp.route('', methods=['GET'])
@login_required
def get_menu():
    db = get_db()
    items = db.execute('SELECT * FROM menu_items ORDER BY name ASC').fetchall()
    return jsonify(success=True, data=[dict(row) for row in items])

@bp.route('', methods=['POST'])
@login_required
def add_menu_item():
    data = request.get_json()
    name = data.get('name')
    price = data.get('price')
    unit = data.get('unit', '')

    if not name or price is None:
        return jsonify(success=False, message="Name and price are required"), 400

    try:
        price = int(price)
    except ValueError:
        return jsonify(success=False, message="Price must be a number"), 400

    db = get_db()
    cursor = db.execute(
        'INSERT INTO menu_items (name, price, unit) VALUES (?, ?, ?)',
        (name, price, unit)
    )
    db.commit()
    
    return jsonify(success=True, message="Menu item added successfully", id=cursor.lastrowid)

@bp.route('/<int:id>', methods=['PUT'])
@login_required
def update_menu_item(id):
    data = request.get_json()
    name = data.get('name')
    price = data.get('price')
    unit = data.get('unit', '')
    status = data.get('status', 'Active')

    if not name or price is None:
        return jsonify(success=False, message="Name and price are required"), 400

    try:
        price = int(price)
    except ValueError:
        return jsonify(success=False, message="Price must be a number"), 400

    db = get_db()
    db.execute(
        'UPDATE menu_items SET name = ?, price = ?, unit = ?, status = ? WHERE id = ?',
        (name, price, unit, status, id)
    )
    db.commit()
    
    return jsonify(success=True, message="Menu item updated successfully")
