# QuickCart - E-Commerce Platform Knowledge Base

## Project Overview

**QuickCart** is a modern e-commerce web application built with **Next.js 15** (App Router), designed for selling electronics and tech products. The application supports both customer shopping experiences and seller dashboard functionality.

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router (Turbopack enabled) |
| **React 19** | UI library |
| **Tailwind CSS 3.4** | Utility-first CSS framework |
| **Clerk** | Authentication & user management |
| **MongoDB/Mongoose** | Database (via Mongoose ODM) |
| **Inngest** | Background job processing & webhook handling |
| **react-hot-toast** | Toast notifications |

## Project Structure

```
QuickCart/
├── app/                    # Next.js App Router pages
│   ├── layout.js          # Root layout (Clerk, AppContext, Toaster)
│   ├── page.jsx           # Homepage
│   ├── globals.css        # Global styles
│   ├── all-products/      # Product listing page
│   ├── product/[id]/      # Dynamic product detail page
│   ├── cart/              # Shopping cart page
│   ├── my-orders/         # Customer order history
│   ├── order-placed/      # Order confirmation page
│   ├── add-address/       # Address form page
│   ├── seller/            # Seller dashboard (nested layout)
│   │   ├── layout.jsx     # Seller dashboard layout
│   │   ├── page.jsx       # Add Product form
│   │   ├── product-list/  # Seller's product list
│   │   └── orders/        # Seller's orders
│   └── inngest/           # Inngest webhook handler (API route)
├── components/            # Reusable UI components
│   ├── Navbar.jsx         # Main navigation
│   ├── Footer.jsx         # Site footer
│   ├── ProductCard.jsx    # Product display card
│   ├── HeaderSlider.jsx   # Homepage carousel
│   ├── HomeProducts.jsx   # Homepage product grid
│   ├── FeaturedProduct.jsx# Featured product section
│   ├── Banner.jsx         # Promotional banner
│   ├── NewsLetter.jsx     # Newsletter signup
│   ├── OrderSummary.jsx   # Cart order summary & checkout
│   ├── Loading.jsx        # Loading spinner
│   └── seller/            # Seller-specific components
│       ├── Navbar.jsx
│       ├── Sidebar.jsx
│       └── Footer.jsx
├── context/               # React Context providers
│   └── AppContext.jsx     # Global app state (cart, user, products)
├── config/                # Configuration files
│   ├── db.js             # MongoDB connection
│   └── inngest.js        # Inngest client & functions
├── lib/                   # Utility libraries
│   └── authSeller.js     # Seller authentication helper
├── models/                # Mongoose schemas
│   └── user.js           # User model
├── assets/                # Static assets & dummy data
│   └── assets.js         # Image imports & dummy data
├── middleware.ts          # Clerk authentication middleware
└── public/                # Public static files
```

## Core Features

### 1. Customer Features
- **Browse Products**: View all products on `/all-products`
- **Product Details**: View individual product on `/product/[id]`
- **Shopping Cart**: Add/remove products, adjust quantities at `/cart`
- **Checkout Flow**: Address selection, promo codes, order placement
- **Order History**: View past orders at `/my-orders`
- **Authentication**: Sign in via Clerk (UserButton with custom menu items)

### 2. Seller Features (Protected Routes)
- **Add Products**: Upload product images, set name/description/category/price
- **Product Management**: View all products in tabular format
- **Order Management**: View customer orders
- **Seller Role Check**: `authSeller.js` verifies `publicMetadata.role === 'seller'`

## Application Flow

### Authentication Flow
1. Clerk handles auth via `ClerkProvider` in root layout
2. `middleware.ts` applies Clerk middleware to protect routes
3. User data synced to MongoDB via Inngest webhooks:
   - `clerk/user.created` → Create user in DB
   - `clerk/user.updated` → Update user in DB
   - `clerk/user.deleted` → Delete user from DB

### State Management (AppContext)
The `AppContext` provides global state:
```javascript
{
  user,                    // Clerk user object
  currency,                // From NEXT_PUBLIC_CURRENCY env
  router,                  // Next.js router
  isSeller, setIsSeller,   // Seller mode toggle
  userData, fetchUserData, // User data from DB
  products, fetchProductData, // Product catalog
  cartItems, setCartItems, // Shopping cart state
  addToCart,               // Add item to cart
  updateCartQuantity,      // Update cart item quantity
  getCartCount,            // Total items in cart
  getCartAmount            // Total cart value
}
```

### Shopping Flow
1. Browse products on homepage or `/all-products`
2. Click product → navigate to `/product/[id]`
3. "Add to Cart" or "Buy Now" → updates `cartItems` in context
4. View cart at `/cart` with `OrderSummary` component
5. Select address (or add new via `/add-address`)
6. Apply promo code (optional)
7. "Place Order" → creates order → redirects to `/order-placed`
8. Auto-redirect to `/my-orders` after 5 seconds

## Product Categories
- Earphone
- Headphone
- Watch
- Smartphone
- Laptop
- Camera
- Accessories

## Key Components

### Navbar (`components/Navbar.jsx`)
- Logo with home navigation
- Desktop nav: Home, Shop, About Us, Contact
- Seller Dashboard button (conditionally shown)
- User menu via Clerk UserButton with custom actions:
  - Cart, My Orders (desktop)
  - Home, Products, Cart, My Orders (mobile)

### ProductCard (`components/ProductCard.jsx`)
- Product image with hover scale effect
- Wishlist button (heart icon)
- Product name, description (truncated)
- Star rating display
- Price with "Buy now" button

### OrderSummary (`components/OrderSummary.jsx`)
- Address dropdown selector
- "Add New Address" option
- Promo code input
- Item count, subtotal, shipping (free), tax (2%)
- Total calculation
- "Place Order" button

### Seller Sidebar (`components/seller/Sidebar.jsx`)
- Add Product, Product List, Orders navigation
- Active state highlighting with orange accent

## Database Schema

### User Model (`models/user.js`)
```javascript
{
  id: String,         // Clerk user ID
  name: String,
  email: String,      // Unique
  ImageUrl: String,
  password: String,
  isAdmin: Boolean    // Default: false
}
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string |
| `NEXT_PUBLIC_CURRENCY` | Currency symbol (e.g., "$") |
| Clerk variables | Clerk API keys |

## Current State (Development)

The application currently uses **dummy data** from `assets/assets.js`:
- `productsDummyData` - Sample product catalog
- `userDummyData` - Sample user data
- `orderDummyData` - Sample order data
- `addressDummyData` - Sample addresses

**Note**: API integration and database operations are not yet fully implemented. Functions like `handleSubmit`, `createOrder`, `onSubmitHandler` are placeholder stubs.

## File Naming Conventions

- Pages: `page.jsx`
- Layouts: `layout.jsx`
- Components: PascalCase (e.g., `ProductCard.jsx`)
- Utils/Config: camelCase (e.g., `authSeller.js`)
- Assets: snake_case (e.g., `heart_icon.svg`)

## Styling Guidelines

- Tailwind CSS for all styling
- Orange accent color: `orange-500`, `orange-600`
- Gray text: `gray-500`, `gray-600`, `gray-700`, `gray-800`
- Responsive breakpoints: `max-sm`, `md`, `lg`, `xl`
- Font: Outfit (Google Font) with weights 300, 400, 500

## Known Issues / TODOs

1. Inngest config imports itself (`import { inngest } from "./client"` should reference same file)
2. Typos in `inngest.js`: `lasr_name` should be `last_name`, `inage_url` should be `image_url`
3. `syncUserDeletion` is registered twice in inngest route
4. MongoDB database name has a space: `"quick cart "` (should be fixed)
5. Form submissions (`handleSubmit`, `createOrder`, `onSubmitHandler`) are empty stubs
6. Currently using all dummy data instead of real API calls
