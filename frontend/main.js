const API_BASE = '';

let products = [];
let cart = [];
let authToken = null;
let currentUser = null;
let orders = [];

function loadAuthFromStorage() {
  try {
    const saved = localStorage.getItem('auth');
    if (!saved) return;
    const parsed = JSON.parse(saved);
    authToken = parsed.token || null;
    currentUser = parsed.user || null;
  } catch {
    authToken = null;
    currentUser = null;
  }
}

function saveAuthToStorage() {
  localStorage.setItem('auth', JSON.stringify({ token: authToken, user: currentUser }));
}

function clearAuth() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('auth');
}

function formatPrice(value) {
  return `₹${value.toFixed(2)}`;
}

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('cart');
    cart = saved ? JSON.parse(saved) : [];
  } catch {
    cart = [];
  }
}

function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cart-count').textContent = count;
}

function updateAuthUI() {
  const userInfo = document.getElementById('user-info');
  const loginToggle = document.getElementById('login-toggle');
  const emailSpan = document.getElementById('user-email');
  const avatar = document.getElementById('user-avatar');

  if (authToken && currentUser) {
    userInfo.classList.remove('hidden');
    loginToggle.classList.add('hidden');
    emailSpan.textContent = currentUser.email;
    avatar.textContent = currentUser.name ? currentUser.name[0].toUpperCase() : 'U';
  } else {
    userInfo.classList.add('hidden');
    loginToggle.classList.remove('hidden');
  }
}

function renderProducts() {
  const container = document.getElementById('products-grid');
  container.innerHTML = '';

  products.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const image = document.createElement('div');
    image.className = 'product-image';
    image.textContent = p.name[0] || 'Clothes';

    const title = document.createElement('div');
    title.className = 'product-title';
    title.textContent = p.name;

    const desc = document.createElement('div');
    desc.className = 'product-desc';
    desc.textContent = p.description || '';

    const meta = document.createElement('div');
    meta.className = 'product-meta';
    meta.textContent = `Sizes: ${p.size || 'Free size'} • Category: ${p.category || 'Clothing'}`;

    const footer = document.createElement('div');
    footer.className = 'product-footer';

    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = formatPrice(p.price);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = 'Add to cart';
    addBtn.addEventListener('click', () => addToCart(p));

    footer.appendChild(price);
    footer.appendChild(addBtn);

    card.appendChild(image);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(meta);
    card.appendChild(footer);

    container.appendChild(card);
  });
}

function addToCart(product) {
  const existing = cart.find((item) => item.productId === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
  }
  saveCartToStorage();
  updateCartCount();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.productId !== productId);
  saveCartToStorage();
  updateCartCount();
  renderCart();
}

function changeQuantity(productId, delta) {
  const item = cart.find((i) => i.productId === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId);
  } else {
    saveCartToStorage();
    updateCartCount();
    renderCart();
  }
}

function renderCart() {
  const list = document.getElementById('cart-items');
  const summary = document.getElementById('cart-summary');
  list.innerHTML = '';

  if (cart.length === 0) {
    list.innerHTML = '<p>Your cart is empty.</p>';
    summary.innerHTML = '';
    return;
  }

  let total = 0;

  cart.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cart-item';

    const info = document.createElement('div');
    info.className = 'cart-item-info';
    info.innerHTML = `
      <div class="cart-item-title">${item.name}</div>
      <div class="cart-item-meta">${item.quantity} × ${formatPrice(item.price)}</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'cart-item-actions';

    const minusBtn = document.createElement('button');
    minusBtn.className = 'btn btn-light';
    minusBtn.textContent = '-';
    minusBtn.addEventListener('click', () => changeQuantity(item.productId, -1));

    const plusBtn = document.createElement('button');
    plusBtn.className = 'btn btn-light';
    plusBtn.textContent = '+';
    plusBtn.addEventListener('click', () => changeQuantity(item.productId, 1));

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-light';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeFromCart(item.productId));

    actions.appendChild(minusBtn);
    actions.appendChild(plusBtn);
    actions.appendChild(removeBtn);

    row.appendChild(info);
    row.appendChild(actions);

    list.appendChild(row);

    total += item.price * item.quantity;
  });

  summary.innerHTML = `
    <div><strong>Total</strong></div>
    <div><strong>${formatPrice(total)}</strong></div>
  `;
}

async function fetchProducts() {
  const res = await fetch(`${API_BASE}/api/products`);
  if (!res.ok) throw new Error('Failed to load products');
  products = await res.json();
  renderProducts();
}

async function fetchMyOrders() {
  if (!authToken || !currentUser) {
    const container = document.getElementById('orders-content');
    container.innerHTML = '<p class="muted">Sign in and place an order to see it here.</p>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/orders/my`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!res.ok) {
      throw new Error('Failed to load orders');
    }
    orders = await res.json();
    renderOrders();
  } catch (err) {
    console.error(err);
    const container = document.getElementById('orders-content');
    container.innerHTML =
      '<p class="message error">Failed to load orders. Please try again later.</p>';
  }
}

function renderOrders() {
  const container = document.getElementById('orders-content');
  container.innerHTML = '';

  if (!orders.length) {
    container.innerHTML = '<p class="muted">No orders yet. Place your first order!</p>';
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'order-card';

    const header = document.createElement('div');
    header.className = 'order-header';

    const idEl = document.createElement('div');
    idEl.className = 'order-id';
    idEl.textContent = `Order #${order.id}`;

    const dateEl = document.createElement('div');
    dateEl.className = 'order-date';
    const date = new Date(order.createdAt);
    dateEl.textContent = date.toLocaleString();

    header.appendChild(idEl);
    header.appendChild(dateEl);

    const itemsEl = document.createElement('div');
    itemsEl.className = 'order-items';
    itemsEl.innerHTML = order.items
      .map(
        (item) =>
          `${item.quantity} × ${item.productName} (${formatPrice(item.price)})`
      )
      .join('<br />');

    const total = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const totalEl = document.createElement('div');
    totalEl.className = 'order-total';
    totalEl.textContent = `Total: ${formatPrice(total)}`;

    card.appendChild(header);
    card.appendChild(itemsEl);
    card.appendChild(totalEl);

    container.appendChild(card);
  });
}

async function submitOrder(event) {
  event.preventDefault();
  const messageEl = document.getElementById('checkout-message');

  if (!authToken) {
    messageEl.textContent = 'Please sign in to place your order.';
    messageEl.className = 'message error';
    return;
  }

  if (cart.length === 0) {
    messageEl.textContent = 'Your cart is empty.';
    messageEl.className = 'message error';
    return;
  }

  const customerName = document.getElementById('customerName').value.trim();
  const email = document.getElementById('email').value.trim();
  const address = document.getElementById('address').value.trim();

  if (!customerName || !email || !address) {
    messageEl.textContent = 'Please fill in all fields.';
    messageEl.className = 'message error';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        customerName,
        email,
        address,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      }),
    });

    if (!res.ok) {
      throw new Error('Order failed');
    }

    const data = await res.json();
    messageEl.textContent = `Order placed successfully! Your order ID is #${data.orderId}.`;
    messageEl.className = 'message success';
    cart = [];
    saveCartToStorage();
    updateCartCount();
    renderCart();
    document.getElementById('checkout-form').reset();
  } catch (err) {
    console.error(err);
    messageEl.textContent = 'Something went wrong placing your order. Please try again.';
    messageEl.className = 'message error';
  }
}

function setupNavigation() {
  const productsSection = document.getElementById('products-section');
  const cartSection = document.getElementById('cart-section');
  const authSection = document.getElementById('auth-section');
  const ordersSection = document.getElementById('orders-section');
  const navShop = document.getElementById('nav-shop');
  const navOrders = document.getElementById('nav-orders');

  function showSection(section) {
    productsSection.classList.add('hidden');
    cartSection.classList.add('hidden');
    authSection.classList.add('hidden');
    ordersSection.classList.add('hidden');
    navShop.classList.remove('active');
    document.getElementById('view-cart-btn').classList.remove('active');
    navOrders.classList.remove('active');

    if (section === 'products') {
      productsSection.classList.remove('hidden');
      navShop.classList.add('active');
    } else if (section === 'cart') {
      cartSection.classList.remove('hidden');
      document.getElementById('view-cart-btn').classList.add('active');
      renderCart();
    } else if (section === 'auth') {
      authSection.classList.remove('hidden');
    } else if (section === 'orders') {
      ordersSection.classList.remove('hidden');
      navOrders.classList.add('active');
      fetchMyOrders();
    }
  }

  navShop.addEventListener('click', () => showSection('products'));

  document.getElementById('view-cart-btn').addEventListener('click', () =>
    showSection('cart')
  );

  document.getElementById('back-to-products').addEventListener('click', () =>
    showSection('products')
  );

  document.getElementById('login-toggle').addEventListener('click', () =>
    showSection('auth')
  );

  document.getElementById('logout-btn').addEventListener('click', () => {
    clearAuth();
    updateAuthUI();
    showSection('products');
  });

  navOrders.addEventListener('click', () => showSection('orders'));
}

function setupAuthForms() {
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginPanel = document.getElementById('auth-login');
  const registerPanel = document.getElementById('auth-register');

  function showLogin() {
    loginPanel.classList.remove('hidden');
    registerPanel.classList.add('hidden');
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  }

  function showRegister() {
    registerPanel.classList.remove('hidden');
    loginPanel.classList.add('hidden');
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
  }

  loginTab.addEventListener('click', showLogin);
  registerTab.addEventListener('click', showRegister);

  document
    .getElementById('login-form')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const messageEl = document.getElementById('login-message');
      messageEl.textContent = '';
      messageEl.className = 'message';

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error('Server returned invalid response for login.');
        }
        if (!res.ok) {
          throw new Error(data.error || 'Login failed');
        }
        authToken = data.token;
        currentUser = data.user;
        saveAuthToStorage();
        updateAuthUI();
        messageEl.textContent = 'Logged in successfully.';
        messageEl.className = 'message success';
      } catch (err) {
        console.error(err);
        messageEl.textContent = err.message || 'Login failed.';
        messageEl.className = 'message error';
      }
    });

  document
    .getElementById('register-form')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const messageEl = document.getElementById('register-message');
      messageEl.textContent = '';
      messageEl.className = 'message';

      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value.trim();

      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error('Server returned invalid response for registration.');
        }
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }
        authToken = data.token;
        currentUser = data.user;
        saveAuthToStorage();
        updateAuthUI();
        messageEl.textContent = 'Account created and logged in.';
        messageEl.className = 'message success';
      } catch (err) {
        console.error(err);
        messageEl.textContent = err.message || 'Registration failed.';
        messageEl.className = 'message error';
      }
    });
}

function init() {
  document.getElementById('year').textContent = new Date().getFullYear();
  loadAuthFromStorage();
  setupNavigation();
  setupAuthForms();
  loadCartFromStorage();
  updateCartCount();
  updateAuthUI();
  document
    .getElementById('checkout-form')
    .addEventListener('submit', submitOrder);

  fetchProducts().catch((err) => {
    console.error(err);
    document.getElementById('products-grid').innerHTML =
      '<p>Failed to load products. Make sure the server is running.</p>';
  });
}

document.addEventListener('DOMContentLoaded', init);


