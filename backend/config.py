import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-super-secret-key')
    DATABASE_URI = os.environ.get('DATABASE_URI', os.path.join(os.path.abspath(os.path.dirname(__file__)), 'canteen.db'))
    # Set to true for production when setting up CORS
    CORS_HEADERS = 'Content-Type'
