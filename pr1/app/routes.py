import os
import random
import string
from flask import Blueprint, render_template, redirect, url_for, request, flash, session
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from app import db
from app.models import User, MenuItem, Order, OrderItem

main = Blueprint('main', __name__)

# ------------------- Generate Fake Payment Token -------------------
def generate_payment_token(length=12):
    return 'PAY' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# ------------------- Home -------------------
@main.route('/')
def home():
    return render_template('home.html')

# ------------------- Register -------------------
@main.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'danger')
            return redirect(url_for('main.register'))

        hashed_pw = generate_password_hash(password)
        user = User(username=username, email=email, password=hashed_pw)
        db.session.add(user)
        db.session.commit()
        flash('Registered successfully. Please login.', 'success')
        return redirect(url_for('main.login'))

    return render_template('register.html')

# ------------------- Login -------------------
@main.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            flash("Login successful!", "success")
            return redirect(url_for('main.menu'))
        flash("Invalid credentials", "danger")
    return render_template('login.html')

# ------------------- Logout -------------------
@main.route('/logout')
@login_required
def logout():
    logout_user()
    flash("Logged out successfully", "info")
    return redirect(url_for('main.home'))

# ------------------- Menu -------------------
@main.route('/menu')
def menu():
    items = MenuItem.query.filter_by(availability=True).all()
    cart = session.get('cart', {})
    cart_total = 0
    for item_id, qty in cart.items():
        item = MenuItem.query.get(int(item_id))
        if item:
            cart_total += item.price * qty
    return render_template('menu.html', menu=items, cart=cart, cart_total=cart_total)

# ------------------- Add to Cart -------------------
@main.route('/add_to_cart/<int:item_id>')
@login_required
def add_to_cart(item_id):
    item = MenuItem.query.get_or_404(item_id)
    if item.stock == 0 or not item.availability:
        flash("Item out of stock", "warning")
        return redirect(url_for('main.menu'))

    cart = session.get('cart', {})
    current_qty = cart.get(str(item_id), 0)

    if current_qty >= item.stock:
        flash("Not enough stock available", "danger")
    else:
        cart[str(item_id)] = current_qty + 1
        session['cart'] = cart
        session.modified = True  # ✅ This line is critical
        flash("Item added to cart", "success")

    return redirect(url_for('main.menu'))


# ------------------- View Cart -------------------
@main.route('/cart')
@login_required
def cart():
    if current_user.role == 'admin':
        flash("Admins do not have a cart", "info")
        return redirect(url_for('main.menu'))

    cart = session.get('cart', {})
    items = []
    total = 0
    for item_id, qty in cart.items():
        item = MenuItem.query.get(int(item_id))
        if item:
            subtotal = item.price * qty
            total += subtotal
            items.append({
                'item': item,
                'quantity': qty,
                'subtotal': subtotal
            })
    return render_template('cart.html', items=items, total=total)

# ------------------- Place Order -------------------
@main.route('/place_order')
@login_required
def place_order():
    if current_user.role == 'admin':
        flash("Admins cannot place orders", "danger")
        return redirect(url_for('main.menu'))

    cart = session.get('cart', {})
    if not cart:
        flash("Cart is empty", "warning")
        return redirect(url_for('main.menu'))

    total = 0
    payment_token = generate_payment_token()

    order = Order(user_id=current_user.id, total=0, payment_token=payment_token)
    db.session.add(order)
    db.session.commit()

    for item_id, qty in cart.items():
        item = MenuItem.query.get(int(item_id))
        if item.stock < qty:
            flash(f"Not enough stock for {item.name}", "danger")
            return redirect(url_for('main.cart'))

        subtotal = item.price * qty
        total += subtotal

        order_item = OrderItem(order_id=order.id, item_id=item.id, quantity=qty, price=subtotal)
        db.session.add(order_item)

        item.stock -= qty
        if item.stock == 0:
            item.availability = False

    order.total = total
    db.session.commit()
    session['cart'] = {}
    session.modified = True
    flash("Order placed successfully!", "success")
    return redirect(url_for('main.confirmation', order_id=order.id))

# ------------------- Confirmation -------------------
@main.route('/order/confirmation/<int:order_id>')
@login_required
def confirmation(order_id):
    order = Order.query.get_or_404(order_id)
    if order.user_id != current_user.id:
        flash("Access denied", "danger")
        return redirect(url_for('main.menu'))

    return render_template('confirmation.html', order=order)

# ------------------- Admin Dashboard -------------------
@main.route('/admin/dashboard')
@login_required
def dashboard():
    if current_user.role != 'admin':
        flash("Access denied", "danger")
        return redirect(url_for('main.menu'))

    items = MenuItem.query.all()
    return render_template('dashboard.html', items=items)

# ------------------- Admin Add Menu Item -------------------
@main.route('/admin/add_item', methods=['GET', 'POST'])
@login_required
def add_item():
    if current_user.role != 'admin':
        flash("Access denied", "danger")
        return redirect(url_for('main.menu'))

    if request.method == 'POST':
        name = request.form['name']
        category = request.form['category']
        price = float(request.form['price'])
        stock = int(request.form['stock'])

        image_file = request.files['image']
        if image_file:
            filename = secure_filename(image_file.filename)
            image_path = os.path.join('app', 'static', 'images', filename)
            image_file.save(image_path)

            new_item = MenuItem(
                name=name,
                category=category,
                price=price,
                stock=stock,
                image=filename,
                availability=True if stock > 0 else False
            )
            db.session.add(new_item)
            db.session.commit()
            flash("Menu item added successfully", "success")
            return redirect(url_for('main.dashboard'))
        else:
            flash("Please upload an image", "danger")

    return render_template('add_item.html')

# ------------------- Admin: View All Orders -------------------
@main.route('/admin/orders')
@login_required
def view_orders():
    if current_user.role != 'admin':
        flash("Access denied", "danger")
        return redirect(url_for('main.menu'))

    orders = Order.query.order_by(Order.id.desc()).all()
    return render_template('admin_orders.html', orders=orders)
# ------------------- Admin Edit Menu Item -------------------
@main.route('/admin/edit_item/<int:item_id>', methods=['GET', 'POST'])
@login_required
def edit_item(item_id):
    if current_user.role != 'admin':
        flash("Access denied", "danger")
        return redirect(url_for('main.menu'))

    item = MenuItem.query.get_or_404(item_id)

    if request.method == 'POST':
        item.name = request.form['name']
        item.category = request.form['category']
        item.price = float(request.form['price'])
        item.stock = int(request.form['stock'])

        # Auto-set availability based on stock
        item.availability = True if item.stock > 0 else False

        db.session.commit()
        flash("Item updated successfully", "success")
        return redirect(url_for('main.dashboard'))

    return render_template('edit_item.html', item=item)
# ------------------- Update Cart -------------------
@main.route('/update_cart/<int:item_id>', methods=['POST'])
@login_required
def update_cart(item_id):
    if current_user.role == 'admin':
        flash("Admins do not have a cart", "info")
        return redirect(url_for('main.menu'))

    action = request.form.get('action')
    cart = session.get('cart', {})
    item_id_str = str(item_id)

    item = MenuItem.query.get_or_404(item_id)

    if item_id_str not in cart:
        flash("Item not found in cart", "warning")
        return redirect(url_for('main.cart'))

    if action == 'increment':
        if cart[item_id_str] < item.stock:
            cart[item_id_str] += 1
            flash(f"Increased quantity for {item.name}", "success")
        else:
            flash(f"Cannot add more than stock limit for {item.name}", "danger")

    elif action == 'decrement':
        if cart[item_id_str] > 1:
            cart[item_id_str] -= 1
            flash(f"Decreased quantity for {item.name}", "info")
        else:
            del cart[item_id_str]
            flash(f"Removed {item.name} from cart", "warning")

    elif action == 'remove':
        del cart[item_id_str]
        flash(f"Removed {item.name} from cart", "danger")

    session['cart'] = cart
    session.modified = True
    return redirect(url_for('main.cart'))
