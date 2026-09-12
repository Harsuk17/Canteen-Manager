from flask import Blueprint, jsonify
from ..database import get_db
from ..utils.auth import login_required

bp = Blueprint('ledger', __name__, url_prefix='/api/ledger')

@bp.route('/<int:employee_id>', methods=['GET'])
@login_required
def get_employee_ledger(employee_id):
    db = get_db()
    
    # Get employee details
    employee = db.execute('SELECT * FROM employees WHERE id = ?', (employee_id,)).fetchone()
    if not employee:
        return jsonify(success=False, message="Employee not found"), 404

    # We need to construct a unified ledger of debits (MONTHLY bills) and credits (Payments)
    # Both need to be sorted chronologically
    
    bills = db.execute('''
        SELECT id, created_at, 'DEBIT' as type, 'Consumption - Bill ' || bill_number as description, total_amount as amount
        FROM bills
        WHERE employee_id = ? AND payment_method = 'MONTHLY'
    ''', (employee_id,)).fetchall()
    
    payments = db.execute('''
        SELECT id, created_at, 'CREDIT' as type, 'Payment - ' || payment_method as description, amount
        FROM payments
        WHERE employee_id = ?
    ''', (employee_id,)).fetchall()
    
    # Combine and sort by created_at ascending
    ledger = [dict(b) for b in bills] + [dict(p) for p in payments]
    ledger.sort(key=lambda x: x['created_at'])
    
    # Calculate running balance
    running_balance = 0
    for entry in ledger:
        if entry['type'] == 'DEBIT':
            running_balance += entry['amount']
        else: # CREDIT
            running_balance -= entry['amount']
        entry['balance_after'] = running_balance
        
    # Reverse to show newest first for UI
    ledger.reverse()
    
    return jsonify(success=True, data={
        'employee': dict(employee),
        'ledger': ledger,
        'current_balance': running_balance
    })
