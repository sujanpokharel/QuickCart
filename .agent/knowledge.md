# QuickCart - E-Commerce Project Knowledge Base

## Overview

QuickCart is a full-stack e-commerce application built with Next.js, featuring a customer shopping experience, a seller dashboard for managing products and orders, and an admin dashboard for site management.

## Technology Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 (App Router) | React framework with server-side rendering |
| React 19 | Frontend UI library |
| Tailwind CSS | Styling |
| MongoDB (Local) | Database (MongoDB Community Server) |
| Mongoose | MongoDB ODM |
| JWT (jsonwebtoken) | Authentication tokens |
| jose | JWT verification for Edge Runtime (Middleware) |
| bcryptjs | Password hashing |
| react-hot-toast | Toast notifications |

## Project Structure

```
QuickCart/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── messages/route.js   # Message management
│   │   │   └── users/route.js      # User/Seller management
│   │   ├── auth/
│   │   │   ├── login/route.js      # Login endpoint
│   │   │   ├── register/route.js   # Registration endpoint
│   │   │   ├── logout/route.js     # Logout endpoint
│   │   │   └── me/route.js         # Get current user
│   │   ├── user/
│   │   │   └── profile/route.js    # Profile management
│   │   ├── product/
│   │   │   ├── route.js            # GET all, POST new
│   │   │   └── [id]/route.js       # GET, PUT, DELETE single
│   │   ├── order/
│   │   │   ├── route.js            # GET user orders, POST new
│   │   │   └── seller/route.js     # Seller order management
│   │   ├── feature/route.js        # Feature/Hero content management
│   │   ├── contact/route.js        # Customer inquiry submission
│   │   ├── address/route.js        # Address CRUD
│   │   ├── cart/route.js           # Cart sync
│   │   └── seed/route.js           # Database seeding (Dummy data)
│   ├── admin/                      # Admin Dashboard
│   │   ├── features/               # Manage homepage features
│   │   ├── messages/               # Customer inquiries
│   │   ├── users/                  # User management
│   │   └── page.jsx                # Admin stats/entry
│   ├── seller/                     # Seller Dashboard
│   │   ├── product-list/page.jsx   # Product management
│   │   └── orders/page.jsx         # Order management
│   ├── product/[id]/page.jsx       # Product details
│   ├── all-products/page.jsx       # Shop all page
│   ├── cart/page.jsx               # Shopping cart
│   ├── my-orders/page.jsx          # User order history
│   ├── my-profile/page.jsx         # User profile
│   ├── contact/page.jsx            # Contact us page
│   ├── order-placed/page.jsx       # Success page
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
│   ├── user.js                     # User schema (isAdmin flag)
│   ├── Product.js                  # Product schema
│   ├── Order.js                    # Order schema
│   ├── Address.js                  # Address schema
│   ├── Message.js                  # Contact message schema
│   └── feature.js                  # Homepage feature/banner schema
├── lib/
│   ├── auth.js                     # Auth utilities (JWT, password)
│   ├── authSeller.js               # Seller authorization
│   └── authAdmin.js                # Admin authorization
├── config/
│   └── db.js                       # MongoDB connection
├── middleware.js                   # Route protection (Edge compatible)
└── assets/                         # Static assets
```

## Authentication System

### Roles & Permissions
- **Customer**: Default role. Can browse, cart, and order.
- **Seller**: Can manage their own products and orders. Accesses `/seller`.
- **Admin**: Can manage all users, update site features, and respond to messages. Accesses `/admin`.

### Local JWT Authentication
- Users register with email/password (passwords hashed with bcrypt).
- JWT tokens stored in httpOnly cookies (7-day expiry).
- Middleware protects routes based on authentication, seller role, and admin role.

### Auth Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user (optional seller flag) |
| `/api/auth/login` | POST | Login with email/password |
| `/api/auth/logout` | POST | Clear auth cookie |
| `/api/auth/me` | GET | Get current user data |
| `/api/user/profile` | PUT | Update user profile (name, phone, etc) |

## API Routes

### Admin API
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/users` | GET | List all users (excluding passwords) |
| `/api/admin/users` | PUT | Toggle user's seller status |
| `/api/admin/users` | DELETE | Remove a user |
| `/api/admin/messages` | GET | List all contact messages |
| `/api/admin/messages` | PUT | Reply to or update message status |

### Features & Site Content
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/feature` | GET | No | Get homepage hero/banners |
| `/api/feature` | POST | Admin | Add new feature content |
| `/api/feature` | DELETE | Admin | Delete feature content |
| `/api/contact` | GET/POST | Yes | Get/Submit contact messages |

### Products & Orders
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/product` | GET | No | Get all products |
| `/api/product` | POST | Seller | Add new product |
| `/api/order` | GET | Yes | Get user's orders |
| `/api/order/seller` | GET | Seller | Get seller's orders |
| `/api/seed` | POST | No | Seed DB with dummy data |

## Database Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  isSeller: Boolean (default: false),
  isAdmin: Boolean (default: false),
  phone: String,
  description: String,
  imageUrl: String,
  cartItems: Object (default: {}),
  createdAt: Date
}
```

### Feature
```javascript
{
  type: String ('hero', 'featured', 'banner'),
  title: String,
  description: String,
  image: String,
  secondaryImage: String,
  product: ObjectId (optional link),
  buttonText: String,
  order: Number
}
```

### Message
```javascript
{
  name: String,
  email: String,
  message: String,
  status: String ('Unread', 'Read', 'Replied'),
  reply: String,
  createdAt: Date
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `NEXT_PUBLIC_CURRENCY` | No | Currency symbol (default: $) |

## Features

### Admin Features
- Manage users (promote to seller, delete users)
- Manage homepage content (Hero sections, Banners)
- View and reply to customer messages

### Customer & Seller Features
- Order tracking and history
- Address management
- Profile management (name, phone, bio)
- Product listings with category filtering
- Seller dashboard for inventory and sales

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

## Known Issues / TODOs

1. Images stored as URLs/Base64 - should migrate to S3/Cloudinary for production.
2. Payment integration (Stripe/PayPal) is missing.
3. Product search is visual only (not functional).
4. No automated email notifications for orders.

## Real-time Signaling & Communication

### Real-time Signaling System
- **Signaling API**: `/api/signal`
  - Handles `GET` (poll for new signals) and `POST` (send a signal).
  - Used for WebRTC coordination (call invites, status updates).
- **Signal Model**: `models/Signal.js`
  - Stores signals with an `expireAfterSeconds` TTL of 60 seconds.
  - Fields: `from`, `to`, `type`, `data`, `read`.

### Video & Voice Calls
- **Technology**: Built using **PeerJS** for peer-to-peer WebRTC connections.
- **Components**:
  - `ChatWidget.jsx`: User-side chat and call interface (Messenger style).
  - `AdminMessages.jsx`: Admin-side conversation management and call handling.
  - `VideoCallInterface.jsx`: Premium, glassmorphic UI for active calls with full media controls.
- **Standard Flow**:
  1. User/Admin initiates call -> `CALL_INVITE` signal sent via `/api/signal`.
  2. Receiver polls signal -> Shows incoming call UI.
  3. Receiver accepts -> Connects via PeerJS and shares media streams.
  4. Call termination -> `CALL_ENDED` signal sent; tracks stopped.

### Admin Dashboard (Updated)
- **Inbox**: Advanced messaging system with real-time signal polling.
- **Live Support**: Admin can initiate voice or video calls directly with customers.
- **Premium UI**: Uses glassmorphism, smooth animations, and a modern layout.
