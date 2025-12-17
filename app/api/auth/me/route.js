import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import connectDB from '@/config/db';
import User from '@/models/user';

export async function GET() {
    try {
        const tokenUser = await getCurrentUser();

        if (!tokenUser) {
            return NextResponse.json({
                success: true,
                user: null
            });
        }

        await connectDB();

        // Get fresh user data from database
        const user = await User.findById(tokenUser.userId).select('-password');

        if (!user) {
            return NextResponse.json({
                success: true,
                user: null
            });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isSeller: user.isSeller,
                isAdmin: user.isAdmin,
                phone: user.phone || '',
                description: user.description || '',
                imageUrl: user.imageUrl,
                cartItems: user.cartItems
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
