import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import User from '@/models/user';
import { getCurrentUser } from '@/lib/auth';

// POST - Sync cart items to database
export async function POST(request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();

        const body = await request.json();
        const { cartItems } = body;

        await User.findByIdAndUpdate(user.userId, { cartItems });

        return NextResponse.json({ success: true, message: 'Cart synced successfully' });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// GET - Get cart items from database
export async function GET(request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();

        const dbUser = await User.findById(user.userId);

        return NextResponse.json({ success: true, cartItems: dbUser?.cartItems || {} });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
