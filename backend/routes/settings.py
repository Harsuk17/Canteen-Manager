from flask import Blueprint, request, jsonify
from ..database import get_db
from ..utils.auth import login_required

bp = Blueprint('settings', __name__, url_prefix='/api/settings')

@bp.route('', methods=['GET'])
@login_required
def get_settings():
    db = get_db()
    settings = db.execute('SELECT * FROM settings').fetchall()
    return jsonify(success=True, data={s['key']: s['value'] for s in settings})

@bp.route('', methods=['PUT'])
@login_required
def update_settings():
    data = request.get_json()
    db = get_db()
    
    for key, value in data.items():
        # Check if exists
        exists = db.execute('SELECT 1 FROM settings WHERE key = ?', (key,)).fetchone()
        if exists:
            db.execute('UPDATE settings SET value = ? WHERE key = ?', (value, key))
        else:
            db.execute('INSERT INTO settings (key, value) VALUES (?, ?)', (key, value))
            
    db.commit()
    return jsonify(success=True, message="Settings updated successfully")
