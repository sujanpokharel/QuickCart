# QuickCart - E-Commerce Project Knowledge Base

## Overview

QuickCart is a full-stack e-commerce application built with Next.js, featuring a customer shopping experience and a seller dashboard for managing products and orders.

## Technology Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 (App Router) | React framework with server-side rendering |
| React 19 | Frontend UI library |
| Tailwind CSS | Styling |
| MongoDB (Local) | Database (MongoDB Community Server) |
| Mongoose | MongoDB ODM |
| JWT (jsonwebtoken) | Authentication tokens |
| bcryptjs | Password hashing |
| react-hot-toast | Toast notifications |

## Project Structure

```
QuickCart/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.js      # Login endpoint
│   │   │   ├── register/route.js   # Registration endpoint
│   │   │   ├── logout/route.js     # Logout endpoint
│   │   │   └── me/route.js         # Get current user
│   │   ├── product/
│   │   │   ├── route.js            # GET all, POST new
│   │   │   └── [id]/route.js       # GET, PUT, DELETE single
│   │   ├── order/
│   │   │   ├── route.js            # GET user orders, POST new
│   │   │   └── seller/route.js     # Seller order management
│   │   ├── address/route.js        # Address CRUD
│   │   └── cart/route.js           # Cart sync
│   ├── login/page.jsx              # Login page
│   ├── register/page.jsx           # Registration page
│   ├── seller/
│   │   ├── layout.jsx              # Seller dashboard layout
│   │   ├── page.jsx                # Add Product form
│   │   ├── product-list/page.jsx   # Product management
│   │   └── orders/page.jsx         # Order management
│   ├── product/[id]/page.jsx       # Product details
│   ├── cart/page.jsx               # Shopping cart
│   ├── my-orders/page.jsx          # User order history
│   ├── layout.js                   # Root layout
│   └── page.jsx                    # Homepage
├── components/
│   ├── Navbar.jsx                  # Navigation with auth
│   ├── ProductCard.jsx
│   ├── OrderSummary.jsx
│   └── seller/
│       ├── Sidebar.jsx
│       └── Footer.jsx
├── context/
│   └── AppContext.jsx              # Global state (user, cart, products)
├── models/
│   ├── user.js                     # User schema
│   ├── Product.js                  # Product schema
│   ├── Order.js                    # Order schema
│   └── Address.js                  # Address schema
├── lib/
│   ├── auth.js                     # Auth utilities (JWT, password)
│   └── authSeller.js               # Seller authorization
├── config/
│   └── db.js                       # MongoDB connection
├── middleware.js                   # Route protection
└── assets/                         # Static assets
```

## Authentication System

### Local JWT Authentication
- Users register with email/password (passwords hashed with bcrypt)
- JWT tokens stored in httpOnly cookies (7-day expiry)
- Middleware protects routes based on authentication and seller role
- No external services required - completely local

### Auth Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user (optional seller flag) |
| `/api/auth/login` | POST | Login with email/password |
| `/api/auth/logout` | POST | Clear auth cookie |
| `/api/auth/me` | GET | Get current user data |

### Route Protection
- **Protected Routes**: `/my-orders`, `/add-address` (require login)
- **Seller Routes**: `/seller/*` (require login + isSeller flag)
- **Auth Routes**: `/login`, `/register` (redirect if already logged in)

## API Routes

### Products
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/product` | GET | No | Get all products |
| `/api/product` | POST | Seller | Add new product |
| `/api/product/[id]` | GET | No | Get single product |
| `/api/product/[id]` | PUT | Seller+Owner | Update product |
| `/api/product/[id]` | DELETE | Seller+Owner | Delete product |

### Orders
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/order` | GET | Yes | Get user's orders |
| `/api/order` | POST | Yes | Create new order |
| `/api/order/seller` | GET | Seller | Get seller's orders |
| `/api/order/seller` | PUT | Seller | Update order status |

### Other
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/address` | GET/POST/DELETE | Yes | Address management |
| `/api/cart` | GET/POST | Yes | Cart sync to DB |

## Database Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  imageUrl: String,
  isSeller: Boolean,
  cartItems: Object,
  createdAt: Date
}
```

### Product
```javascript
{
  userId: String (seller ID),
  name: String,
  description: String,
  price: Number,
  offerPrice: Number,
  image: [String] (array of URLs or base64),
  category: String,
  date: Date
}
```

### Order
```javascript
{
  userId: String,
  items: [{ product: ObjectId, quantity: Number }],
  amount: Number,
  address: { fullName, phoneNumber, pincode, area, city, state },
  status: String (Order Placed/Shipped/Out for Delivery/Delivered/Cancelled),
  paymentMethod: String,
  isPaid: Boolean,
  date: Date
}
```

### Address
```javascript
{
  userId: String,
  fullName: String,
  phoneNumber: String,
  pincode: String,
  area: String,
  city: String,
  state: String
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string (e.g., `mongodb://localhost:27017`) |
| `JWT_SECRET` | Yes | Secret key for JWT signing (change in production!) |
| `NEXT_PUBLIC_CURRENCY` | No | Currency symbol (default: $) |

## Getting Started

### Prerequisites
1. Node.js 18+
2. MongoDB Community Server (local installation)

### Setup Steps
1. Install dependencies: `npm install`
2. Start MongoDB service (Windows: `net start MongoDB` or MongoDB Compass)
3. Create `.env` file with:
   ```
   MONGODB_URI=mongodb://localhost:27017
   JWT_SECRET=your-secret-key-here
   NEXT_PUBLIC_CURRENCY=$
   ```
4. Run development server: `npm run dev`
5. Open http://localhost:3000

### Creating a Seller Account
1. Go to `/register`
2. Fill in name, email, password
3. Check "Register as a Seller"
4. Click "Create account"
5. You'll be redirected and can access `/seller` dashboard

## Features

### Customer Features
- Browse products with categories
- Product detail pages
- Shopping cart (persisted when logged in)
- Order placement
- Order history
- Address management

### Seller Features
- Add products with images
- Product listing with delete
- Order management with status updates
- Dashboard with sidebar navigation

## File Naming Conventions

- Pages: `page.jsx`
- Layouts: `layout.jsx`
- Components: PascalCase (e.g., `ProductCard.jsx`)
- Utils/Config: camelCase (e.g., `authSeller.js`)
- API Routes: `route.js` in folder structure
- Models: PascalCase (e.g., `Product.js`)

## Known Issues / TODOs

1. Images stored as base64 - should use file uploads to `/public` for production
2. No payment integration yet
3. No email verification
4. Cart not persisting for guest users
5. Product search not implemented
