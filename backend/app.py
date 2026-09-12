from flask import Flask, jsonify
import os
from .config import Config

def create_app():
    app = Flask(__name__, static_folder='../frontend', static_url_path='/')
    app.config.from_object(Config)

    # Register CLI commands
    @app.cli.command("init-db")
    def init_db_command():
        from .database import init_db, seed_db
        init_db()
        seed_db()
        print("Initialized the database.")

    # Middleware to set CORS headers (simple version for this app)
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

    # Register blueprints (routes)
    from .routes import auth, employees, menu, billing, payments, ledger, reports, whatsapp, settings
    app.register_blueprint(auth.bp)
    app.register_blueprint(employees.bp)
    app.register_blueprint(menu.bp)
    app.register_blueprint(billing.bp)
    app.register_blueprint(payments.bp)
    app.register_blueprint(ledger.bp)
    app.register_blueprint(reports.bp)
    app.register_blueprint(whatsapp.bp)
    app.register_blueprint(settings.bp)

    # Serve the frontend
    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    @app.route('/<path:path>')
    def static_proxy(path):
        # send_static_file will guess the correct MIME type
        return app.send_static_file(path)

    # Error handling
    @app.errorhandler(404)
    def not_found(e):
        return jsonify(success=False, message="Resource not found"), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify(success=False, message="Internal server error"), 500

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
