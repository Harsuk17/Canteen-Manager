from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
from ..database import get_db

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify(success=False, message="Missing credentials"), 400

    username = data['username']
    password = data['password']

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()

    if user and check_password_hash(user['password_hash'], password):
        session.clear()
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify(success=True, message="Login successful")
    
    return jsonify(success=False, message="Invalid username or password"), 401

@bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify(success=True, message="Logged out successfully")

@bp.route('/status', methods=['GET'])
def status():
    if 'user_id' in session:
        return jsonify(success=True, logged_in=True, username=session['username'])
    return jsonify(success=True, logged_in=False)
