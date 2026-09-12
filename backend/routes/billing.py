from flask import Blueprint, request, jsonify
from datetime import datetime
from ..database import get_db
from ..utils.auth import login_required

bp = Blueprint('billing', __name__, url_prefix='/api/bills')

def generate_bill_number(db):
    date_str = datetime.now().strftime('%Y%m%d')
    prefix = f"CAN-{date_str}-"
    
    # Find the latest bill for today
    last_bill = db.execute('''
        SELECT bill_number FROM bills 
        WHERE bill_number LIKE ? 
        ORDER BY id DESC LIMIT 1
    ''', (f'{prefix}%',)).fetchone()
    
    if last_bill:
        last_sequence = int(last_bill['bill_number'].split('-')[-1])
        new_sequence = last_sequence + 1
    else:
        new_sequence = 1
        
    return f"{prefix}{new_sequence:04d}"

@bp.route('', methods=['POST'])
@login_required
def create_bill():
    data = request.get_json()
    employee_id = data.get('employee_id')
    items = data.get('items', [])
    # Always enforce MONTHLY for consumption bills to track them in accounts
    payment_method = 'MONTHLY'

    if not employee_id or not items:
        return jsonify(success=False, message="Missing required fields"), 400

    db = get_db()
    
    # Validate employee
    employee = db.execute('SELECT * FROM employees WHERE id = ? AND status = "Active"', (employee_id,)).fetchone()
    if not employee:
        return jsonify(success=False, message="Invalid or inactive employee"), 400

    try:
        db.execute('BEGIN TRANSACTION')
        
        total_amount = 0
        bill_items_data = []
        
        # Validate items and calculate total
        for item in items:
            item_id = item.get('id')
            quantity = item.get('quantity')
            
            if not item_id or not quantity or int(quantity) <= 0:
                raise ValueError("Invalid item or quantity")
            
            menu_item = db.execute('SELECT * FROM menu_items WHERE id = ? AND status = "Active"', (item_id,)).fetchone()
            if not menu_item:
                raise ValueError(f"Menu item {item_id} not found or inactive")
                
            price = menu_item['price']
            subtotal = price * int(quantity)
            total_amount += subtotal
            
            bill_items_data.append({
                'menu_item_id': item_id,
                'quantity': int(quantity),
                'price_at_billing': price,
                'subtotal': subtotal
            })

        bill_number = generate_bill_number(db)
        
        # Create bill
        cursor = db.execute('''
            INSERT INTO bills (bill_number, employee_id, total_amount, payment_method)
            VALUES (?, ?, ?, ?)
        ''', (bill_number, employee_id, total_amount, payment_method))
        bill_id = cursor.lastrowid
        
        # Create bill items
        for bi in bill_items_data:
            db.execute('''
                INSERT INTO bill_items (bill_id, menu_item_id, quantity, price_at_billing, subtotal)
                VALUES (?, ?, ?, ?, ?)
            ''', (bill_id, bi['menu_item_id'], bi['quantity'], bi['price_at_billing'], bi['subtotal']))
            
        db.commit()
        
        # Return updated balances
        monthly_bills = db.execute("SELECT SUM(total_amount) as total FROM bills WHERE employee_id = ? AND payment_method = 'MONTHLY'", (employee_id,)).fetchone()['total'] or 0
        payments = db.execute("SELECT SUM(amount) as total FROM payments WHERE employee_id = ?", (employee_id,)).fetchone()['total'] or 0
        current_balance = monthly_bills - payments

        return jsonify(
            success=True, 
            message="Consumption recorded successfully", 
            bill_id=bill_id, 
            bill_number=bill_number,
            total_amount=total_amount,
            new_balance=current_balance
        )
        
    except ValueError as e:
        db.rollback()
        return jsonify(success=False, message=str(e)), 400
    except Exception as e:
        db.rollback()
        print(f"Error creating bill: {e}")
        return jsonify(success=False, message="Failed to generate bill"), 500

@bp.route('', methods=['GET'])
@login_required
def get_bills():
    db = get_db()
    # Simple pagination or limit could be added here
    bills = db.execute('''
        SELECT b.*, e.name as employee_name 
        FROM bills b
        JOIN employees e ON b.employee_id = e.id
        ORDER BY b.created_at DESC
        LIMIT 100
    ''').fetchall()
    
    return jsonify(success=True, data=[dict(row) for row in bills])

@bp.route('/<int:id>', methods=['GET'])
@login_required
def get_bill(id):
    db = get_db()
    bill = db.execute('''
        SELECT b.*, e.name as employee_name 
        FROM bills b
        JOIN employees e ON b.employee_id = e.id
        WHERE b.id = ?
    ''', (id,)).fetchone()
    
    if not bill:
        return jsonify(success=False, message="Bill not found"), 404
        
    items = db.execute('''
        SELECT bi.*, m.name as item_name
        FROM bill_items bi
        JOIN menu_items m ON bi.menu_item_id = m.id
        WHERE bi.bill_id = ?
    ''', (id,)).fetchall()
    
    result = dict(bill)
    result['items'] = [dict(row) for row in items]
    
    return jsonify(success=True, data=result)
