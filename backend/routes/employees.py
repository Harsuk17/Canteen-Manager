from flask import Blueprint, request, jsonify
from ..database import get_db
from ..utils.auth import login_required

bp = Blueprint('employees', __name__, url_prefix='/api/employees')

@bp.route('', methods=['GET'])
@login_required
def get_employees():
    db = get_db()
    employees = db.execute('SELECT * FROM employees ORDER BY name ASC').fetchall()
    
    # We also need to fetch their current balance. 
    # Current Balance = Total Monthly Bills - Total Payments
    
    result = []
    for emp in employees:
        emp_dict = dict(emp)
        # Calculate balance
        monthly_bills = db.execute('''
            SELECT SUM(total_amount) as total 
            FROM bills 
            WHERE employee_id = ? AND payment_method = 'MONTHLY'
        ''', (emp['id'],)).fetchone()['total'] or 0
        
        payments = db.execute('''
            SELECT SUM(amount) as total 
            FROM payments 
            WHERE employee_id = ?
        ''', (emp['id'],)).fetchone()['total'] or 0
        
        emp_dict['current_balance'] = monthly_bills - payments
        result.append(emp_dict)

    return jsonify(success=True, data=result)

@bp.route('/<int:id>', methods=['GET'])
@login_required
def get_employee(id):
    db = get_db()
    emp = db.execute('SELECT * FROM employees WHERE id = ?', (id,)).fetchone()
    if not emp:
        return jsonify(success=False, message="Employee not found"), 404
        
    emp_dict = dict(emp)
    monthly_bills = db.execute("SELECT SUM(total_amount) as total FROM bills WHERE employee_id = ? AND payment_method = 'MONTHLY'", (id,)).fetchone()['total'] or 0
    payments = db.execute("SELECT SUM(amount) as total FROM payments WHERE employee_id = ?", (id,)).fetchone()['total'] or 0
    emp_dict['current_balance'] = monthly_bills - payments

    return jsonify(success=True, data=emp_dict)

@bp.route('', methods=['POST'])
@login_required
def add_employee():
    data = request.get_json()
    name = data.get('name')
    whatsapp_number = data.get('whatsapp_number')
    department = data.get('department', '')

    if not name:
        return jsonify(success=False, message="Name is required"), 400

    db = get_db()
    cursor = db.execute(
        'INSERT INTO employees (name, whatsapp_number, department) VALUES (?, ?, ?)',
        (name, whatsapp_number, department)
    )
    db.commit()
    
    return jsonify(success=True, message="Employee added successfully", id=cursor.lastrowid)

@bp.route('/<int:id>', methods=['PUT'])
@login_required
def update_employee(id):
    data = request.get_json()
    name = data.get('name')
    whatsapp_number = data.get('whatsapp_number')
    department = data.get('department', '')
    status = data.get('status', 'Active')

    if not name:
        return jsonify(success=False, message="Name is required"), 400

    db = get_db()
    db.execute(
        'UPDATE employees SET name = ?, whatsapp_number = ?, department = ?, status = ? WHERE id = ?',
        (name, whatsapp_number, department, status, id)
    )
    db.commit()
    
    return jsonify(success=True, message="Employee updated successfully")
