from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from config import Config
from werkzeug.security import generate_password_hash

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'main.login'  # Because login route is under blueprint

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)

    # Register blueprint
    from app.routes import main
    app.register_blueprint(main)

    # ✅ Inject MenuItem into all templates (for cart bar)
    @app.context_processor
    def inject_models():
        from app.models import MenuItem
        return dict(MenuItem=MenuItem)

    # Initialize DB & create admin on first run
    with app.app_context():
        from app.models import User
        db.create_all()
        create_admin()

    return app

# 🔒 Create default admin user if not present
def create_admin():
    from app.models import User
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        hashed_pw = generate_password_hash('admin')
        admin = User(username='admin', email='admin@canteen.com', password=hashed_pw, role='admin')
        db.session.add(admin)
        db.session.commit()
        print("✅ Admin user created (username: admin, password: admin)")
