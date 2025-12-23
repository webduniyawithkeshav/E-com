# Simple Node.js Ecommerce (Clothing Store)

A simple full‑stack Node.js ecommerce app to sell clothes.  
Includes:

- **Backend**: Node.js + Express + SQLite
- **Frontend**: Vanilla HTML/CSS/JS
- **Auth**: Signup & login with hashed passwords + JWT
- **Orders**: Cart, checkout, and “My Orders” page per user

---

## Features

- **Product catalog**
  - Pre‑seeded clothes (t‑shirt, jeans, hoodie, sneakers)
  - API: `GET /api/products`

- **User authentication**
  - Register: `POST /api/auth/register`
  - Login: `POST /api/auth/login`
  - Passwords hashed with **bcrypt**
  - JWT tokens for authentication, stored in `localStorage` on frontend

- **Cart & checkout**
  - Add products to cart (stored in browser `localStorage`)
  - Checkout form (name, email, address)
  - Orders saved to **SQLite**:
    - `orders` table
    - `order_items` table
  - Protected route: `POST /api/orders` (requires JWT)

- **My Orders**
  - View all orders placed by the logged‑in user
  - API: `GET /api/orders/my`
  - Shows items, quantities, and totals

---

## Tech Stack

- **Backend**
  - Node.js
  - Express
  - SQLite (via `sqlite3`)
  - `bcryptjs` for password hashing
  - `jsonwebtoken` for JWT

- **Frontend**
  - HTML
  - CSS
  - Vanilla JavaScript (no framework)

---

## Getting Started

### 1. Clone or download this repo

git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name### 2. Install dependencies

npm install### 3. Run the app

npm startBy default the server listens on:

http://localhost:4000Open that URL in your browser.

---

## Project Structure

.
├─ backend/
│  ├─ server.js      # Express server, routes, auth, static serving
│  └─ store.js       # SQLite DB setup, models & queries
├─ frontend/
│  ├─ index.html     # Main UI: shop, cart, auth, orders
│  ├─ styles.css     # Styling
│  └─ main.js        # Frontend logic (cart, auth, orders)
├─ package.json      # Scripts and dependencies
└─ README.md---

## API Overview

### Auth

- **POST `/api/auth/register`**
  - Body:
   
    { "name": "User", "email": "user@example.com", "password": "secret" }
      - Response:
   
    { "token": "JWT_TOKEN", "user": { "id": 1, "name": "User", "email": "user@example.com" } }
    - **POST `/api/auth/login`**
  - Body:
   
    { "email": "user@example.com", "password": "secret" }
      - Response: same shape as register.

### Products

- **GET `/api/products`**
  - Returns list of products.

### Orders

- **POST `/api/orders`** (auth required)
  - Headers:
    - `Authorization: Bearer <JWT_TOKEN>`
  - Body:
   
    {
      "customerName": "User",
      "email": "ignored-on-server",
      "address": "Some address",
      "items": [
        { "productId": 1, "quantity": 2 },
        { "productId": 3, "quantity": 1 }
      ]
    }
      - The server uses the **logged‑in user’s email** from the JWT, ignoring the email in the body.

- **GET `/api/orders/my`** (auth required)
  - Returns all orders for the logged‑in user (with items).

---

## Environment Variables

Optional:

- `PORT` – override the port (default: `4000`).
- `JWT_SECRET` – secret key for signing JWTs (default: `dev_secret_change_me`).

Example:

set JWT_SECRET="some-very-secret-key"
npm start(on PowerShell / Windows use `set`, on Linux/Mac use `export`)

---

## Development Notes

- On first run, the app will create `backend/ecommerce.db` and seed a few sample products.
- Auth tokens are **stored in `localStorage`** on the frontend.
- Orders and users are stored permanently in the SQLite database file.

---

## Future Improvements (Ideas)

- Admin panel to manage products.
- Order status (Pending, Shipped, Delivered).
- Pagination & search for products.
- Switch to React frontend or Next.js.
- Deploy on Render/Railway with a managed PostgreSQL database.
