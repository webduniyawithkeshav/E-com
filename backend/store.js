const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'ecommerce.db');

let db;

function initDb() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        return reject(err);
      }

      db.serialize(() => {
        db.run(
          `CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            imageUrl TEXT,
            size TEXT,
            category TEXT
          )`
        );

        db.run(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            passwordHash TEXT NOT NULL
          )`
        );

        db.run(
          `CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customerName TEXT NOT NULL,
            email TEXT NOT NULL,
            address TEXT NOT NULL,
            createdAt TEXT NOT NULL
          )`
        );

        db.run(
          `CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId INTEGER NOT NULL,
            productId INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY(orderId) REFERENCES orders(id),
            FOREIGN KEY(productId) REFERENCES products(id)
          )`
        );

        // Seed some clothes if table is empty
        db.get('SELECT COUNT(*) AS count FROM products', (countErr, row) => {
          if (countErr) {
            return reject(countErr);
          }
          if (row.count === 0) {
            const stmt = db.prepare(
              'INSERT INTO products (name, description, price, imageUrl, size, category) VALUES (?, ?, ?, ?, ?, ?)'
            );
            const sampleProducts = [
              ['Classic T-Shirt', 'Soft cotton t-shirt in multiple colors.', 19.99, '/images/tshirt.jpg', 'S,M,L,XL', 'Top'],
              ['Blue Jeans', 'Slim fit denim jeans.', 39.99, '/images/jeans.jpg', '30,32,34,36', 'Bottom'],
              ['Hoodie', 'Comfortable fleece hoodie.', 29.99, '/images/hoodie.jpg', 'S,M,L,XL', 'Top'],
              ['Sneakers', 'Casual everyday sneakers.', 49.99, '/images/sneakers.jpg', '7,8,9,10', 'Shoes']
            ];
            sampleProducts.forEach((p) => stmt.run(p));
            stmt.finalize();
          }
          resolve();
        });
      });
    });
  });
}

function getAllProducts() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM products', (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function createOrder({ customerName, email, address, items }) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      const createdAt = new Date().toISOString();

      db.run(
        'INSERT INTO orders (customerName, email, address, createdAt) VALUES (?, ?, ?, ?)',
        [customerName, email, address, createdAt],
        function (err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          const orderId = this.lastID;
          const stmt = db.prepare(
            'INSERT INTO order_items (orderId, productId, quantity) VALUES (?, ?, ?)'
          );

          for (const item of items) {
            stmt.run([orderId, item.productId, item.quantity]);
          }

          stmt.finalize((stmtErr) => {
            if (stmtErr) {
              db.run('ROLLBACK');
              return reject(stmtErr);
            }
            db.run('COMMIT');
            resolve(orderId);
          });
        }
      );
    });
  });
}

function getOrdersByEmail(email) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        o.id as orderId,
        o.customerName,
        o.email,
        o.address,
        o.createdAt,
        p.name as productName,
        p.price as productPrice,
        oi.quantity
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      JOIN products p ON p.id = oi.productId
      WHERE o.email = ?
      ORDER BY o.createdAt DESC, o.id DESC
    `;

    db.all(sql, [email], (err, rows) => {
      if (err) return reject(err);
      const ordersMap = new Map();

      for (const row of rows) {
        if (!ordersMap.has(row.orderId)) {
          ordersMap.set(row.orderId, {
            id: row.orderId,
            customerName: row.customerName,
            email: row.email,
            address: row.address,
            createdAt: row.createdAt,
            items: [],
          });
        }
        ordersMap.get(row.orderId).items.push({
          productName: row.productName,
          price: row.productPrice,
          quantity: row.quantity,
        });
      }

      resolve(Array.from(ordersMap.values()));
    });
  });
}

function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function createUser({ name, email, passwordHash }) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT INTO users (name, email, passwordHash) VALUES (?, ?, ?)'
    );
    stmt.run([name, email, passwordHash], function (err) {
      if (err) {
        return reject(err);
      }
      resolve({ id: this.lastID, name, email });
    });
    stmt.finalize();
  });
}

module.exports = {
  initDb,
  getAllProducts,
  createOrder,
  getUserByEmail,
  createUser,
  getOrdersByEmail,
};


