from flask import Blueprint, request, jsonify
from ..database import get_db
from ..utils.auth import login_required

bp = Blueprint('payments', __name__, url_prefix='/api/payments')

@bp.route('', methods=['POST'])
@login_required
def record_payment():
    data = request.get_json()
    employee_id = data.get('employee_id')
    amount = data.get('amount')
    payment_method = data.get('payment_method')
    note = data.get('note', '')

    if not employee_id or amount is None or not payment_method:
        return jsonify(success=False, message="Missing required fields"), 400

    try:
        amount = int(amount)
        if amount <= 0:
            return jsonify(success=False, message="Amount must be greater than zero"), 400
    except ValueError:
        return jsonify(success=False, message="Invalid amount"), 400

    if payment_method not in ['CASH', 'UPI']:
        return jsonify(success=False, message="Invalid payment method"), 400

    db = get_db()
    
    # Check current balance to prevent overpayment (optional but good practice)
    # The prompt: "Do not allow payment greater than outstanding balance unless the system explicitly supports advance credit. Prefer preventing invalid overpayment."
    monthly_bills = db.execute("SELECT SUM(total_amount) as total FROM bills WHERE employee_id = ? AND payment_method = 'MONTHLY'", (employee_id,)).fetchone()['total'] or 0
    existing_payments = db.execute("SELECT SUM(amount) as total FROM payments WHERE employee_id = ?", (employee_id,)).fetchone()['total'] or 0
    current_balance = monthly_bills - existing_payments

    if amount > current_balance:
        return jsonify(success=False, message=f"Payment amount (₹{amount}) cannot exceed current outstanding balance (₹{current_balance})"), 400

    db.execute('''
        INSERT INTO payments (employee_id, amount, payment_method, note)
        VALUES (?, ?, ?, ?)
    ''', (employee_id, amount, payment_method, note))
    db.commit()

    return jsonify(success=True, message="Payment recorded successfully")

@bp.route('', methods=['GET'])
@login_required
def get_payments():
    db = get_db()
    payments = db.execute('''
        SELECT p.*, e.name as employee_name
        FROM payments p
        JOIN employees e ON p.employee_id = e.id
        ORDER BY p.created_at DESC
        LIMIT 100
    ''').fetchall()
    return jsonify(success=True, data=[dict(row) for row in payments])
