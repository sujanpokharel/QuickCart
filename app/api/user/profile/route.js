import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import User from '@/models/user';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();
        const body = await request.json();
        const { name, phone, description, imageUrl } = body;

        // Construct update object
        const updateData = {
            name,
            phone,
            description
        };

        if (imageUrl) {
            updateData.imageUrl = imageUrl;
        }

        const updatedUser = await User.findByIdAndUpdate(
            currentUser.userId,
            updateData,
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Profile updated successfully', user: updatedUser });

    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
