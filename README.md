# Office Canteen

A mobile-first, fast, and secure office canteen billing and employee account management application developed by SHP Technology.

## Features

- **Mobile-First POS**: Fast billing interface optimized for touch devices.
- **Employee Accounts**: Monthly account management and digital ledger.
- **Cash & UPI Tracking**: Record direct payments easily.
- **WhatsApp Integration**: Generate pre-filled, professional click-to-chat WhatsApp messages for daily accounts.
- **Historical Integrity**: Menu price changes do not affect old bills.
- **Reporting**: Daily and dashboard reports for business oversight.

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (No heavy frameworks).
- **Backend**: Python, Flask, REST API.
- **Database**: SQLite.

## Project Structure

```text
office-canteen/
├── frontend/        # All static HTML, CSS, and JS files
├── backend/         # Flask application, models, and routes
└── README.md        # This file
```

## Setup & Installation

### 1. Prerequisites
- Python 3.9+
- A modern web browser

### 2. Backend Setup
Navigate to the project root directory and create a virtual environment (optional but recommended):
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```

Install the dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### 3. Database Initialization
The application uses SQLite. To create the database and seed it with the default menu items and admin account:
```bash
# Ensure you are in the backend/ directory or root depending on your python path
export FLASK_APP=backend.app
flask init-db
```
*Note: The default admin credentials are:*
- **Username**: admin
- **Password**: admin123

*(You must change these in production or implement a password reset).*

### 4. Running Locally
Start the Flask development server:
```bash
python -m backend.app
```
Or use the flask command:
```bash
flask run
```

Open your browser and navigate to: `http://localhost:5000/`

## Production Deployment

This application is designed to be deployed using standard Python WSGI servers (like Gunicorn) behind a reverse proxy (like Nginx).

### Environment Variables
Set the following environment variables in your production environment:
- `SECRET_KEY`: A strong, random string for session signing.
- `DATABASE_URI`: (Optional) Path to your persistent SQLite database.

### Persistent Storage
**CRITICAL**: Because this application uses SQLite, the database file (`canteen.db`) is stored locally. If you deploy to a containerized environment (like Docker, Heroku, or Render), **you must configure a persistent volume**. If you do not mount a persistent volume, all billing and employee data will be permanently lost when the container restarts.

### Database Backup
Regularly back up the `canteen.db` file. 
- **Method**: Simply copy the `.db` file to a secure backup location. 
- **Safety**: To prevent corruption, consider using SQLite's online backup API or lock the database during file-level copy.

## WhatsApp Workflow
This system does NOT use the WhatsApp Business API. It uses standard WhatsApp click-to-chat links.
1. The operator navigates to the "WA" (WhatsApp Accounts) page.
2. The operator reviews the pending amount.
3. The operator clicks the "WhatsApp" button for an employee.
4. The system opens the local WhatsApp application (or WhatsApp Web) with a fully formatted, professional message.
5. **The operator must manually press "Send" in WhatsApp.**

## Legal
&copy; 2026 SHP Technology. All Rights Reserved.
Website: [www.shptechnology.online](https://www.shptechnology.online/)
