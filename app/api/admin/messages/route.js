import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import Message from '@/models/Message';
import authAdmin from '@/lib/authAdmin';
import { getCurrentUser } from '@/lib/auth';

// GET all messages (Admin only)
export async function GET(request) {
    try {
        const isAdmin = await authAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
        }

        await connectDB();
        const messages = await Message.find({}).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, messages });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// PUT - Reply to message or update status (Admin only)
export async function PUT(request) {
    try {
        const isAdmin = await authAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
        }

        await connectDB();
        const { id, reply, status } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });
        }

        const updateData = {};
        if (reply) updateData.reply = reply;
        if (status) updateData.status = status;

        // If replying, automatically set status to Replied
        if (reply) updateData.status = 'Replied';

        const updatedMessage = await Message.findByIdAndUpdate(id, updateData, { new: true });

        return NextResponse.json({ success: true, message: 'Message updated', data: updatedMessage });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// DELETE - Delete message
export async function DELETE(request) {
    try {
        const isAdmin = await authAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
        }

        await connectDB();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        await Message.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
