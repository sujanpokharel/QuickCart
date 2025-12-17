import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import Message from '@/models/Message';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();
        // Fetch messages for this user, sorted by date (oldest first for chat flow)
        const messages = await Message.find({ email: user.email }).sort({ createdAt: 1 });

        return NextResponse.json({ success: true, messages });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectDB();
        const { name, email, message, imageUrl } = await request.json();

        if (!name || !email || !message) {
            return NextResponse.json({ success: false, message: 'Please fill in all fields' }, { status: 400 });
        }

        const newMessage = await Message.create({
            name,
            email,
            message,
            imageUrl
        });

        return NextResponse.json({ success: true, message: 'Message sent successfully', data: newMessage });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
