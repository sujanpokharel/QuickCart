import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-key'
);

// Hash password
export async function hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export async function generateToken(user) {
    const token = await new SignJWT({
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        isSeller: user.isSeller || false,
        isAdmin: user.isAdmin || false
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .setIssuedAt()
        .sign(JWT_SECRET);

    return token;
}

// Verify JWT token
export async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (error) {
        return null;
    }
}

// Get current user from cookies (for server components/API routes)
export async function getCurrentUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return null;
        }

        const decoded = await verifyToken(token);
        return decoded;
    } catch (error) {
        return null;
    }
}

// Check if user is authenticated (for API routes)
export async function isAuthenticated() {
    const user = await getCurrentUser();
    return !!user;
}

// Check if user is a seller
export async function isSeller() {
    const user = await getCurrentUser();
    return user?.isSeller || false;
}
