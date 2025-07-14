from app import db, login_manager
from flask_login import UserMixin
from datetime import datetime

# -------------------- Login Loader --------------------
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# -------------------- User Model --------------------
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(10), default='customer')  # 'customer' or 'admin'

    # Relationship to orders
    orders = db.relationship('Order', backref='user', lazy=True)

# -------------------- Menu Item Model --------------------
class MenuItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))
    price = db.Column(db.Float)
    availability = db.Column(db.Boolean, default=True)
    stock = db.Column(db.Integer, default=10)  # ✅ NEW: Stock quantity
    image = db.Column(db.String(100))

    # Relationship to order items
    order_items = db.relationship('OrderItem', backref='item', lazy=True)

# -------------------- Order Model --------------------
class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    total = db.Column(db.Float)
    payment_token = db.Column(db.String(20))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to order items
    items = db.relationship('OrderItem', backref='order', cascade="all, delete", lazy=True)

# -------------------- OrderItem Model --------------------
class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('menu_item.id'), nullable=False)
    quantity = db.Column(db.Integer)
    price = db.Column(db.Float)  # Subtotal for this item
