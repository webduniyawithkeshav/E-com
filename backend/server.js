const path = require('path');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
  initDb,
  getAllProducts,
  createOrder,
  getUserByEmail,
  createUser,
  getOrdersByEmail,
} = require('./store');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Middleware
app.use(cors());
app.use(express.json());

// Simple auth middleware for protected routes
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API routes
app.get('/api/products', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (err) {
    console.error('Error fetching products', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ name, email, passwordHash });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Error during registration', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Error during login', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { customerName, email, address, items } = req.body;

    if (!customerName || !address || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required order fields' });
    }
    const userEmail = req.user.email;

    const orderId = await createOrder({
      customerName,
      email: userEmail,
      address,
      items,
    });
    res.status(201).json({ success: true, orderId });
  } catch (err) {
    console.error('Error creating order', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders/my', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const orders = await getOrdersByEmail(email);
    res.json(orders);
  } catch (err) {
    console.error('Error fetching user orders', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// Fallback to frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Start server after DB init
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database', err);
    process.exit(1);
  });


