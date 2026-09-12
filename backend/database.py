import sqlite3
import os
from .config import Config

def get_db():
    db = sqlite3.connect(Config.DATABASE_URI)
    db.row_factory = sqlite3.Row
    # Enable foreign keys
    db.execute('PRAGMA foreign_keys = ON;')
    return db

def init_db():
    db = get_db()
    with db:
        # Create users table
        db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create employees table
        db.execute('''
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                whatsapp_number TEXT,
                department TEXT,
                status TEXT DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create menu_items table
        db.execute('''
            CREATE TABLE IF NOT EXISTS menu_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price INTEGER NOT NULL, -- Stored as integer for accuracy (could be paise, but let's use rupees since there are no decimals in menu)
                unit TEXT,
                status TEXT DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create bills table
        db.execute('''
            CREATE TABLE IF NOT EXISTS bills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bill_number TEXT UNIQUE NOT NULL,
                employee_id INTEGER NOT NULL,
                total_amount INTEGER NOT NULL,
                payment_method TEXT NOT NULL, -- CASH, UPI, MONTHLY
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees (id)
            )
        ''')
        
        # Create bill_items table
        db.execute('''
            CREATE TABLE IF NOT EXISTS bill_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bill_id INTEGER NOT NULL,
                menu_item_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price_at_billing INTEGER NOT NULL,
                subtotal INTEGER NOT NULL,
                FOREIGN KEY (bill_id) REFERENCES bills (id),
                FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
            )
        ''')
        
        # Create payments table
        db.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                payment_method TEXT NOT NULL, -- CASH, UPI
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees (id)
            )
        ''')
        
        # Create settings table
        db.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')
        
        # Create daily_account_status table
        db.execute('''
            CREATE TABLE IF NOT EXISTS daily_account_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                record_date DATE NOT NULL,
                status TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees (id),
                UNIQUE(employee_id, record_date)
            )
        ''')

def seed_db():
    # pyrefly: ignore [missing-import]
    from werkzeug.security import generate_password_hash
    db = get_db()
    with db:
        # Check if admin exists
        admin = db.execute('SELECT * FROM users WHERE username = ?', ('admin',)).fetchone()
        if not admin:
            db.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', 
                       ('admin', generate_password_hash('admin123')))
            
        # Check if menu exists
        menu_count = db.execute('SELECT COUNT(*) as count FROM menu_items').fetchone()['count']
        if menu_count == 0:
            initial_menu = [
                ('Veg Biryani', 40, '1 plate'),
                ('Coffee', 15, '1 cup'),
                ('Chai', 10, '1 cup'),
                ('Maggi Wala Pasta', 50, '1 plate'),
                ('Masala Maggi', 35, '1 plate'),
                ('Cheese Maggi', 55, '1 plate'),
                ('Schezwan Maggi', 45, '1 plate'),
                ('Cutlet', 30, '3 pieces'),
                ('Sabudane ke Bhare', 30, '2 pieces'),
                ('Noodles', 40, '1 plate'),
                ('Poha', 15, '1 plate'),
                ('Cheese Sandwich', 70, '1 piece'),
                ('Normal Sandwich', 50, '1 piece')
            ]
            for item in initial_menu:
                db.execute('INSERT INTO menu_items (name, price, unit) VALUES (?, ?, ?)', item)
                
        # Check if setting exists
        setting = db.execute("SELECT * FROM settings WHERE key = 'whatsapp_template'").fetchone()
        if not setting:
            default_template = "📋 OFFICE CANTEEN – DAILY ACCOUNT\n\n👤 Employee: {employee_name}\n📅 Date: {date}\n\nToday's Consumption\n─────────────────\n{items}\n\nToday's Total: ₹{today_total}\n\nPrevious Balance: ₹{previous_balance}\n\n💰 Total Payable: ₹{current_balance}\n\n─────────────────\nThank you for using the Office Canteen."
            db.execute('INSERT INTO settings (key, value) VALUES (?, ?)', ('whatsapp_template', default_template))

if __name__ == '__main__':
    init_db()
    seed_db()
    print("Database initialized and seeded.")
