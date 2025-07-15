document.addEventListener('DOMContentLoaded', () => {
    // --- Page Elements ---
    const loginPage = document.getElementById('login-page');
    const registerPage = document.getElementById('register-page');
    const mainApp = document.getElementById('main-app');
    const adminDashboard = document.getElementById('admin-dashboard');

    // --- Forms & Buttons ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const logoutButton = document.getElementById('logout-button');
    const adminLogoutButton = document.getElementById('admin-logout-button');

    // --- Data Store (using localStorage for persistence) ---
    let users = JSON.parse(localStorage.getItem('canteenUsers')) || [];
    let menuData = JSON.parse(localStorage.getItem('canteenMenu')) || [
        { id: 1, name: 'Samosa', price: 15, image: 'https://placehold.co/600x400/f8b400/ffffff?text=Samosa' },
        { id: 2, name: 'Masala Dosa', price: 60, image: 'https://placehold.co/600x400/f88e00/ffffff?text=Masala+Dosa' },
        { id: 3, name: 'Veg Biryani', price: 80, image: 'https://placehold.co/600x400/f86600/ffffff?text=Veg+Biryani' },
        { id: 4, name: 'Chole Bhature', price: 70, image: 'https://placehold.co/600x400/e95420/ffffff?text=Chole+Bhature' },
    ];
    let orders = JSON.parse(localStorage.getItem('canteenOrders')) || [];
    
    let currentUser = JSON.parse(sessionStorage.getItem('canteenCurrentUser')) || null;
    let cart = [];

    // --- UI Elements (Main App) ---
    const menuContainer = document.getElementById('menu-items');
    const cartButton = document.getElementById('cart-button');
    const closeCartButton = document.getElementById('close-cart');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const checkoutButton = document.getElementById('checkout-button');
    const toast = document.getElementById('toast');
    const currentUserNameSpan = document.getElementById('current-user-name');

    // --- UI Elements (Admin) ---
    const addMenuItemForm = document.getElementById('add-menu-item-form');
    const adminMenuList = document.getElementById('admin-menu-list');
    const allOrdersList = document.getElementById('all-orders-list');

    // --- UI Elements (Modal) ---
    const receiptModal = document.getElementById('receipt-modal');
    const closeReceiptModal = document.getElementById('close-receipt-modal');
    const okReceiptButton = document.getElementById('ok-receipt-button');
    const receiptContent = document.getElementById('receipt-content');

    // --- Data Persistence Functions ---
    function saveUsers() {
        localStorage.setItem('canteenUsers', JSON.stringify(users));
    }
    function saveMenu() {
        localStorage.setItem('canteenMenu', JSON.stringify(menuData));
    }
    function saveOrders() {
        localStorage.setItem('canteenOrders', JSON.stringify(orders));
    }
    function saveCurrentUser() {
        sessionStorage.setItem('canteenCurrentUser', JSON.stringify(currentUser));
    }
    function clearCurrentUser() {
        sessionStorage.removeItem('canteenCurrentUser');
    }

    // --- Page Navigation ---
    function showPage(pageId) {
        [loginPage, registerPage, mainApp, adminDashboard].forEach(page => {
            page.style.display = page.id === pageId ? 'block' : 'none';
        });
    }

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('register-page');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('login-page');
    });

    // --- Authentication ---
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('register-error');

        if (users.find(u => u.username === username)) {
            errorEl.textContent = 'Username already exists.';
        } else {
            users.push({ username, password });
            saveUsers();
            errorEl.textContent = '';
            alert('Registration successful! Please log in.');
            showPage('login-page');
            registerForm.reset();
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        if (username === 'admin' && password === 'admin') {
            currentUser = { username: 'admin', isAdmin: true };
            saveCurrentUser();
            initAdminDashboard();
        } else {
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                currentUser = { ...user, isAdmin: false };
                saveCurrentUser();
                initMainApp();
            } else {
                errorEl.textContent = 'Invalid username or password.';
            }
        }
        loginForm.reset();
    });
    
    function logout() {
        currentUser = null;
        clearCurrentUser();
        cart = [];
        showPage('login-page');
        updateCartSummary();
    }
    logoutButton.addEventListener('click', logout);
    adminLogoutButton.addEventListener('click', logout);

    // --- App Initialization ---
    function checkLoginState() {
        if (currentUser) {
            if (currentUser.isAdmin) {
                initAdminDashboard();
            } else {
                initMainApp();
            }
        } else {
            showPage('login-page');
        }
    }

    function initMainApp() {
        currentUserNameSpan.textContent = currentUser.username;
        renderMenu();
        renderCart();
        showPage('main-app');
    }

    function initAdminDashboard() {
        renderAdminMenu();
        renderAllOrders();
        showPage('admin-dashboard');
    }

    // --- User App Functions ---
    function renderMenu() {
        menuContainer.innerHTML = '';
        menuData.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item bg-white rounded-lg shadow-md overflow-hidden relative group';
            menuItem.innerHTML = `
                <img src="${item.image || 'https://placehold.co/600x400/cccccc/ffffff?text=No+Image'}" alt="${item.name}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="font-bold text-lg">${item.name}</h3>
                    <p class="text-gray-600 mt-1">₹${item.price.toFixed(2)}</p>
                </div>
                <div class="add-to-cart absolute bottom-0 left-0 w-full p-4">
                    <button data-id="${item.id}" class="add-btn w-full bg-orange-500 text-white font-semibold py-2 rounded-lg hover:bg-orange-600 transition duration-300">Add to Cart</button>
                </div>
            `;
            menuContainer.appendChild(menuItem);
        });
    }

    function renderCart() {
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.appendChild(emptyCartMessage);
            emptyCartMessage.style.display = 'block';
        } else {
            emptyCartMessage.style.display = 'none';
            cart.forEach(item => {
                const cartItem = document.createElement('div');
                cartItem.className = 'flex justify-between items-center mb-4 cart-item-enter';
                cartItem.innerHTML = `
                    <div>
                        <h4 class="font-semibold">${item.name}</h4>
                        <p class="text-sm text-gray-500">₹${item.price.toFixed(2)}</p>
                    </div>
                    <div class="flex items-center space-x-3">
                        <button data-id="${item.id}" class="quantity-btn decrease-btn bg-gray-200 w-6 h-6 rounded-full">-</button>
                        <span>${item.quantity}</span>
                        <button data-id="${item.id}" class="quantity-btn increase-btn bg-gray-200 w-6 h-6 rounded-full">+</button>
                        <button data-id="${item.id}" class="remove-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                cartItemsContainer.appendChild(cartItem);
                setTimeout(() => cartItem.classList.add('cart-item-enter-active'), 10);
            });
        }
        updateCartSummary();
    }

    function updateCartSummary() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        cartCount.textContent = totalItems;
        cartTotal.textContent = `₹${totalPrice.toFixed(2)}`;
        checkoutButton.disabled = cart.length === 0;
    }

    function addToCart(itemId) {
        const itemToAdd = menuData.find(item => item.id == itemId);
        const existingItem = cart.find(item => item.id == itemId);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ ...itemToAdd, quantity: 1 });
        }
        showToast(`${itemToAdd.name} added to cart!`);
        renderCart();
    }

    function updateQuantity(itemId, change) {
        const cartItem = cart.find(item => item.id == itemId);
        if (cartItem) {
            cartItem.quantity += change;
            if (cartItem.quantity <= 0) {
                removeFromCart(itemId);
            } else {
                renderCart();
            }
        }
    }
    
    function removeFromCart(itemId) {
        cart = cart.filter(item => item.id != itemId);
        renderCart();
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('opacity-0', 'translate-y-10');
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-10');
        }, 2000);
    }

    function toggleCart() {
        cartSidebar.classList.toggle('translate-x-full');
        cartOverlay.classList.toggle('hidden');
    }

    menuContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-btn')) {
            addToCart(e.target.dataset.id);
        }
    });

    cartItemsContainer.addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button) return;
        const id = button.dataset.id;
        if (button.classList.contains('increase-btn')) updateQuantity(id, 1);
        if (button.classList.contains('decrease-btn')) updateQuantity(id, -1);
        if (button.classList.contains('remove-btn')) removeFromCart(id);
    });

    cartButton.addEventListener('click', toggleCart);
    closeCartButton.addEventListener('click', toggleCart);
    cartOverlay.addEventListener('click', toggleCart);
    
    checkoutButton.addEventListener('click', () => {
        if (cart.length > 0) {
            const order = {
                orderId: Date.now(),
                username: currentUser.username,
                items: [...cart],
                total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
                date: new Date().toLocaleString()
            };
            orders.push(order);
            saveOrders();
            showReceipt(order);
            cart = [];
            renderCart();
            toggleCart();
        }
    });

    // --- Admin Functions ---
    function renderAdminMenu() {
        adminMenuList.innerHTML = '';
        if(menuData.length === 0) {
            adminMenuList.innerHTML = '<p>No items in the menu. Add one above.</p>';
            return;
        }
        menuData.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-2 border rounded-md';
            div.innerHTML = `
                <div>
                    <span class="font-semibold">${item.name}</span> - <span>₹${item.price.toFixed(2)}</span>
                </div>
                <div>
                    <button data-id="${item.id}" class="delete-item-btn text-red-500 hover:text-red-700 p-2"><i class="fas fa-trash"></i></button>
                </div>
            `;
            adminMenuList.appendChild(div);
        });
    }

    function renderAllOrders() {
        allOrdersList.innerHTML = '';
         if(orders.length === 0) {
            allOrdersList.innerHTML = '<p>No orders have been placed yet.</p>';
            return;
        }
        orders.slice().reverse().forEach(order => { // Show newest orders first
            const orderCard = document.createElement('div');
            orderCard.className = 'p-4 border rounded-md bg-gray-50';
            const itemsHtml = order.items.map(item => `<li>${item.name} x ${item.quantity}</li>`).join('');
            orderCard.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold">Order ID: ${order.orderId}</p>
                        <p>User: ${order.username}</p>
                    </div>
                    <div class="text-right">
                        <p>Date: ${order.date}</p>
                        <p class="font-bold text-lg">Total: ₹${order.total.toFixed(2)}</p>
                    </div>
                </div>
                <ul class="list-disc list-inside mt-2 text-sm text-gray-600">${itemsHtml}</ul>
            `;
            allOrdersList.appendChild(orderCard);
        });
    }

    addMenuItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('item-name').value;
        const price = parseFloat(document.getElementById('item-price').value);
        const image = document.getElementById('item-image').value;
        const newItem = {
            id: Date.now(),
            name,
            price,
            image
        };
        menuData.push(newItem);
        saveMenu();
        renderAdminMenu();
        addMenuItemForm.reset();
    });

    adminMenuList.addEventListener('click', (e) => {
        const button = e.target.closest('.delete-item-btn');
        if (button) {
            const id = parseInt(button.dataset.id);
            menuData = menuData.filter(item => item.id !== id);
            saveMenu();
            renderAdminMenu();
        }
    });

    // --- Modal Functions ---
    function showReceipt(order) {
        const itemsHtml = order.items.map(item => `
            <div class="flex justify-between">
                <span>${item.name} x ${item.quantity}</span>
                <span>₹${(item.price * item.quantity).toFixed(2)}</span>
            </div>`).join('');

        receiptContent.innerHTML = `
            <p class="mb-2"><strong>Order ID:</strong> ${order.orderId}</p>
            <p class="mb-4"><strong>Date:</strong> ${order.date}</p>
            <div class="space-y-2 border-t border-b py-2">${itemsHtml}</div>
            <div class="flex justify-between font-bold text-lg mt-4">
                <span>Total</span>
                <span>₹${order.total.toFixed(2)}</span>
            </div>
            <p class="text-center mt-6 text-sm text-gray-600">Thank you for your order!</p>
        `;
        toggleModal(receiptModal, true);
    }

    function toggleModal(modal, show) {
        const modalContent = modal.querySelector('.modal-content');
        if (show) {
            modal.classList.remove('pointer-events-none', 'opacity-0');
            modalContent.classList.remove('-translate-y-full');
            document.body.classList.add('modal-active');
        } else {
            modal.classList.add('opacity-0');
            modalContent.classList.add('-translate-y-full');
            setTimeout(() => {
                modal.classList.add('pointer-events-none');
                document.body.classList.remove('modal-active');
            }, 250);
        }
    }
    
    closeReceiptModal.addEventListener('click', () => toggleModal(receiptModal, false));
    okReceiptButton.addEventListener('click', () => toggleModal(receiptModal, false));

    // --- Initial Load ---
    checkLoginState();
});
