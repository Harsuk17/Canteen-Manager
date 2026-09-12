from flask import Blueprint, request, jsonify
from datetime import datetime
from ..database import get_db
from ..utils.auth import login_required

bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@bp.route('/daily', methods=['GET'])
@login_required
def get_daily_report():
    date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    db = get_db()
    
    # Summary metrics for the given date
    # Consumption (Total Billing) for the date regardless of historical payment method
    sales_total = db.execute("SELECT SUM(total_amount) as total FROM bills WHERE date(created_at, 'localtime') = ?", (date_str,)).fetchone()['total'] or 0
    bills_count = db.execute("SELECT COUNT(*) as count FROM bills WHERE date(created_at, 'localtime') = ?", (date_str,)).fetchone()['count'] or 0
    
    # Payments strictly from the payments table
    payments_received = db.execute("SELECT SUM(amount) as total FROM payments WHERE date(created_at, 'localtime') = ?", (date_str,)).fetchone()['total'] or 0
    
    # Optional: Breakdown of payment methods if needed by UI
    cash_col = db.execute("SELECT SUM(amount) as total FROM payments WHERE payment_method = 'CASH' AND date(created_at, 'localtime') = ?", (date_str,)).fetchone()['total'] or 0
    upi_col = db.execute("SELECT SUM(amount) as total FROM payments WHERE payment_method = 'UPI' AND date(created_at, 'localtime') = ?", (date_str,)).fetchone()['total'] or 0

    # Get all active employees to show their daily status
    employees = db.execute("SELECT id, name FROM employees WHERE status = 'Active'").fetchall()
    
    emp_list = []
    total_delayed = 0
    total_pending_today = 0
    
    for emp in employees:
        emp_id = emp['id']
        
        # Today's bill for this employee (All bills count as consumption)
        today_bill = db.execute('''
            SELECT SUM(total_amount) as total 
            FROM bills 
            WHERE employee_id = ? AND date(created_at, 'localtime') = ?
        ''', (emp_id, date_str)).fetchone()['total'] or 0
        
        # All bills up to yesterday
        bills_upto_yesterday = db.execute('''
            SELECT SUM(total_amount) as total 
            FROM bills 
            WHERE employee_id = ? AND date(created_at, 'localtime') < ?
        ''', (emp_id, date_str)).fetchone()['total'] or 0
        
        # All payments up to yesterday (exclusive of today)
        payments_upto_yesterday = db.execute('''
            SELECT SUM(amount) as total 
            FROM payments 
            WHERE employee_id = ? AND date(created_at, 'localtime') < ?
        ''', (emp_id, date_str)).fetchone()['total'] or 0
        
        # In the old system, CASH/UPI bills didn't go to accounts, they were instant.
        # But the strict rule says: Previous Due = valid outstanding balance before that date.
        # Total Payable = Previous Due + Today's Bill.
        
        # To maintain historical accuracy for old bills that were CASH/UPI, we should only count MONTHLY bills in the balance.
        # OR just include all bills and all payments. If they used CASH/UPI bills, maybe they didn't have payment records. 
        # But the prompt says: "Today's Bill = sum of that client's consumption bills for that date."
        # If the user strictly wants all bills to be consumption, let's keep querying MONTHLY for historical accuracy, but wait, the prompt says "Today's Bill = sum of that client's consumption bills for that date."
        # Let's count all bills as consumption. If old system had CASH bills, we must assume they were settled. Since I don't want to break history, I will calculate balance using ONLY MONTHLY bills, as that was the old system's way of marking "account" consumption. Wait, NEW bills are ALL going to be MONTHLY. So querying MONTHLY is perfectly safe for both old and new data!
        
        today_bill = db.execute('''
            SELECT SUM(total_amount) as total 
            FROM bills 
            WHERE employee_id = ? AND payment_method = 'MONTHLY' AND date(created_at, 'localtime') = ?
        ''', (emp_id, date_str)).fetchone()['total'] or 0

        bills_upto_yesterday = db.execute('''
            SELECT SUM(total_amount) as total 
            FROM bills 
            WHERE employee_id = ? AND payment_method = 'MONTHLY' AND date(created_at, 'localtime') < ?
        ''', (emp_id, date_str)).fetchone()['total'] or 0
        
        # Payments today
        payments_today = db.execute('''
            SELECT SUM(amount) as total 
            FROM payments 
            WHERE employee_id = ? AND date(created_at, 'localtime') = ?
        ''', (emp_id, date_str)).fetchone()['total'] or 0
        
        previous_due = bills_upto_yesterday - payments_upto_yesterday
        if previous_due < 0:
            previous_due = 0 # In case of overpayment
            
        total_due = previous_due + today_bill
        remaining = total_due - payments_today
        if remaining < 0:
            remaining = 0
            
        # Determine status
        status = 'PENDING'
        if total_due == 0:
            status = 'PAID'
        elif payments_today >= total_due:
            status = 'PAID'
        elif payments_today > 0 and remaining > 0:
            status = 'PARTIALLY PAID'
        else:
            # Check if delayed
            is_delayed = db.execute('''
                SELECT id FROM daily_account_status 
                WHERE employee_id = ? AND record_date = ? AND status = 'DELAYED'
            ''', (emp_id, date_str)).fetchone()
            if is_delayed:
                status = 'DELAYED'
                
        if status == 'DELAYED':
            total_delayed += remaining
        elif status in ['PENDING', 'PARTIALLY PAID'] and remaining > 0:
            total_pending_today += remaining

        # Only include clients that have some activity or balance today
        if total_due > 0 or payments_today > 0 or today_bill > 0:
            emp_list.append({
                'id': emp_id,
                'name': emp['name'],
                'today_bill': today_bill,
                'previous_due': previous_due,
                'total_due': total_due,
                'paid': payments_today,
                'remaining': remaining,
                'status': status
            })

    # Sort so PENDING is at top, then DELAYED, then PAID
    def sort_status(e):
        if e['status'] == 'PENDING': return 0
        if e['status'] == 'PARTIALLY PAID': return 1
        if e['status'] == 'DELAYED': return 2
        return 3
        
    emp_list.sort(key=sort_status)

    return jsonify(success=True, data={
        'date': date_str,
        'summary': {
            'sales_total': sales_total,
            'bills_count': bills_count,
            'cash_collection': cash_col,
            'upi_collection': upi_col,
            'payments_received': payments_received,
            'pending_today': total_pending_today,
            'delayed_today': total_delayed,
            'active_clients': len(emp_list)
        },
        'client_report': emp_list
    })

@bp.route('/delay', methods=['POST'])
@login_required
def set_delay():
    data = request.json
    employee_id = data.get('employee_id')
    record_date = data.get('date')
    status = data.get('status', 'DELAYED') # Support explicitly setting PENDING or DELAYED
    
    if not employee_id or not record_date:
        return jsonify(success=False, message="Missing employee_id or date"), 400
        
    db = get_db()
    try:
        if status == 'PENDING':
            # Remove any explicit status to revert to default PENDING
            db.execute('''
                DELETE FROM daily_account_status 
                WHERE employee_id = ? AND record_date = ?
            ''', (employee_id, record_date))
        else:
            db.execute('''
                INSERT INTO daily_account_status (employee_id, record_date, status)
                VALUES (?, ?, ?)
                ON CONFLICT(employee_id, record_date) DO UPDATE SET status = ?
            ''', (employee_id, record_date, status, status))
        db.commit()
        return jsonify(success=True, message=f"Status updated to {status}")
    except Exception as e:
        return jsonify(success=False, message=str(e)), 500

@bp.route('/dashboard', methods=['GET'])
@login_required
def get_dashboard():
    date_str = datetime.now().strftime('%Y-%m-%d')
    db = get_db()
    
    sales_total = db.execute("SELECT SUM(total_amount) as total FROM bills WHERE date(created_at, 'localtime') = ?", (date_str,)).fetchone()['total'] or 0
    bills_count = db.execute("SELECT COUNT(*) as count FROM bills WHERE date(created_at, 'localtime') = ?", (date_str,)).fetchone()['count'] or 0
    
    # Total pending amount across all active employees (all MONTHLY bills - all payments)
    total_monthly_bills = db.execute("SELECT SUM(total_amount) as total FROM bills WHERE payment_method = 'MONTHLY'").fetchone()['total'] or 0
    total_payments = db.execute("SELECT SUM(amount) as total FROM payments").fetchone()['total'] or 0
    pending_amount = total_monthly_bills - total_payments
    if pending_amount < 0:
        pending_amount = 0
        
    total_employees = db.execute("SELECT COUNT(*) as count FROM employees WHERE status = 'Active'").fetchone()['count'] or 0
    
    # Today's payment received
    payments_received = db.execute("SELECT SUM(amount) as total FROM payments WHERE date(created_at, 'localtime') = ?", (date_str,)).fetchone()['total'] or 0
    
    recent_bills = db.execute('''
        SELECT b.*, e.name as employee_name
        FROM bills b
        JOIN employees e ON b.employee_id = e.id
        ORDER BY b.created_at DESC LIMIT 5
    ''').fetchall()

    return jsonify(success=True, data={
        'today_sales': sales_total,
        'today_bills': bills_count,
        'pending_amount': pending_amount,
        'total_employees': total_employees,
        'payments_received_today': payments_received,
        'recent_bills': [dict(r) for r in recent_bills]
    })
