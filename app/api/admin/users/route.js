import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import User from '@/models/user';
import { getCurrentUser } from '@/lib/auth';
import authAdmin from '@/lib/authAdmin';

// GET - List all users
export async function GET(request) {
    try {
        const isAdmin = await authAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: 'Not authorized as admin' }, { status: 403 });
        }

        await connectDB();
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });

        return NextResponse.json({ success: true, users });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// PUT - Toggle Seller Status
export async function PUT(request) {
    try {
        const isAdmin = await authAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: 'Not authorized as admin' }, { status: 403 });
        }

        await connectDB();
        const body = await request.json();
        const { userId } = body;

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        user.isSeller = !user.isSeller;
        await user.save();

        return NextResponse.json({ success: true, message: `User is now ${user.isSeller ? 'a Seller' : 'a Customer'}`, user });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// DELETE - Delete User
export async function DELETE(request) {
    try {
        const isAdmin = await authAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: 'Not authorized as admin' }, { status: 403 });
        }

        await connectDB();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('id');

        if (!userId) {
            return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });
        }

        await User.findByIdAndDelete(userId);

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
