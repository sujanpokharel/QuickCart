import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that require authentication
const protectedRoutes = ['/my-orders', '/add-address'];
// Routes that require seller role
const sellerRoutes = ['/seller'];
// Routes that require admin role
const adminRoutes = ['/admin'];
// Routes that should redirect if already logged in
const authRoutes = ['/login', '/register'];

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-key'
);

async function verifyTokenEdge(token) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (error) {
        console.log('Middleware: Token verification failed:', error.message);
        return null;
    }
}

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('auth-token')?.value;

    let user = null;
    if (token) {
        user = await verifyTokenEdge(token);
    }

    // If user is logged in and tries to access auth routes, redirect to home
    if (user && authRoutes.some(route => pathname.startsWith(route))) {
        console.log('Middleware: Redirecting logged in user from auth route to home');
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Check protected routes
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
        if (!user) {
            console.log('Middleware: Redirecting unauthenticated user from protected route to login');
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // Check seller routes
    if (sellerRoutes.some(route => pathname.startsWith(route))) {
        if (!user) {
            console.log('Middleware: Redirecting unauthenticated user from seller route to login');
            return NextResponse.redirect(new URL('/login', request.url));
        }
        if (!user.isSeller) {
            console.log('Middleware: Redirecting non-seller from seller route to home. User:', user);
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    // Check admin routes
    if (adminRoutes.some(route => pathname.startsWith(route))) {
        if (!user) {
            console.log('Middleware: Redirecting unauthenticated user from admin route to login');
            return NextResponse.redirect(new URL('/login', request.url));
        }
        if (!user.isAdmin) {
            console.log('Middleware: Redirecting non-admin from admin route to home. User:', user);
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/seller/:path*',
        '/admin/:path*',
        '/my-orders/:path*',
        '/add-address/:path*',
        '/login',
        '/register',
    ],
};
