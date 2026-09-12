from flask import Blueprint, request, jsonify
from datetime import datetime
from ..database import get_db
from ..utils.auth import login_required
import urllib.parse

bp = Blueprint('whatsapp', __name__, url_prefix='/api/whatsapp')

@bp.route('/accounts', methods=['GET'])
@login_required
def get_whatsapp_accounts():
    date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    db = get_db()
    
    # We need employees who have consumption today OR have a payment today
    # To be safe, just show all active employees who have any outstanding balance or activity today
    
    employees = db.execute("SELECT * FROM employees WHERE status = 'Active'").fetchall()
    template = db.execute("SELECT value FROM settings WHERE key = 'whatsapp_template'").fetchone()['value']
    
    results = []
    
    for emp in employees:
        emp_id = emp['id']
        
        # Today's consumption for this employee
        today_bills = db.execute('''
            SELECT b.total_amount, m.name, bi.quantity, bi.price_at_billing, bi.subtotal
            FROM bills b
            JOIN bill_items bi ON b.id = bi.bill_id
            JOIN menu_items m ON bi.menu_item_id = m.id
            WHERE b.employee_id = ? AND date(b.created_at, 'localtime') = ? AND b.payment_method = 'MONTHLY'
        ''', (emp_id, date_str)).fetchall()
        
        # Consistent calculations matching daily report
        today_total = sum([b['total_amount'] for b in db.execute('''
            SELECT total_amount FROM bills 
            WHERE employee_id = ? AND date(created_at, 'localtime') = ? AND payment_method = 'MONTHLY'
        ''', (emp_id, date_str)).fetchall()])
        
        bills_upto_yesterday = db.execute('''
            SELECT SUM(total_amount) as total 
            FROM bills 
            WHERE employee_id = ? AND payment_method = 'MONTHLY' AND date(created_at, 'localtime') < ?
        ''', (emp_id, date_str)).fetchone()['total'] or 0
        
        payments_upto_yesterday = db.execute('''
            SELECT SUM(amount) as total 
            FROM payments 
            WHERE employee_id = ? AND date(created_at, 'localtime') < ?
        ''', (emp_id, date_str)).fetchone()['total'] or 0
        
        payments_today = db.execute('''
            SELECT SUM(amount) as total FROM payments 
            WHERE employee_id = ? AND date(created_at, 'localtime') = ?
        ''', (emp_id, date_str)).fetchone()['total'] or 0
        
        previous_balance = bills_upto_yesterday - payments_upto_yesterday
        if previous_balance < 0: previous_balance = 0
            
        total_payable = previous_balance + today_total
        remaining = total_payable - payments_today
        if remaining < 0: remaining = 0
        
        # Only include if they had activity today or a positive balance
        if today_total > 0 or payments_today > 0 or total_payable > 0:
            
            # Format items
            items_text = ""
            for item in today_bills:
                items_text += f"☕ {item['name']} × {item['quantity']} — ₹{item['subtotal']}\n"
            
            if not items_text:
                items_text = "No consumption today."
            
            # Construct message
            msg = template
            msg = msg.replace("{employee_name}", emp['name'])
            # Using basic date format
            formatted_date = datetime.strptime(date_str, '%Y-%m-%d').strftime('%d %B %Y')
            msg = msg.replace("{date}", formatted_date)
            msg = msg.replace("{items}", items_text.strip())
            msg = msg.replace("{today_total}", str(today_total))
            msg = msg.replace("{previous_balance}", str(previous_balance))
            
            # For backward compatibility with the existing template, {current_balance} means the final remaining balance to pay
            msg = msg.replace("{current_balance}", str(remaining))
            
            payment_status = f"₹{payments_today} Received" if payments_today > 0 else "Pending"
            if remaining == 0 and total_payable > 0:
                payment_status = "PAID IN FULL"
                
            msg = msg.replace("{payment_amount}", str(payments_today))
            msg = msg.replace("{payment_status}", payment_status)
            
            # URL encode
            encoded_msg = urllib.parse.quote(msg)
            whatsapp_number = emp['whatsapp_number']
            if whatsapp_number:
                # Basic cleaning of number
                whatsapp_number = ''.join(filter(str.isdigit, whatsapp_number))
                if len(whatsapp_number) == 10:
                    whatsapp_number = "91" + whatsapp_number
            
            whatsapp_url = f"https://wa.me/{whatsapp_number}?text={encoded_msg}" if whatsapp_number else ""
            
            results.append({
                'employee_id': emp_id,
                'employee_name': emp['name'],
                'whatsapp_number': emp['whatsapp_number'],
                'today_total': today_total,
                'current_balance': remaining,
                'whatsapp_url': whatsapp_url,
                'message_preview': msg
            })
            
    return jsonify(success=True, data=results)
