import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import Signal from '@/models/Signal';
import { getCurrentUser } from '@/lib/auth';

// GET - Polling for new signals
export async function GET(request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();
        const target = user.isAdmin ? 'admin' : user.email;

        // Find signals for me and delete them after reading (like a queue)
        const signals = await Signal.find({ to: target }).sort({ createdAt: 1 });

        if (signals.length > 0) {
            await Signal.deleteMany({ _id: { $in: signals.map(s => s._id) } });
        }

        return NextResponse.json({ success: true, signals });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// POST - Sending a signal
export async function POST(request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();
        const { to, type, data } = await request.json();

        if (!to || !type || !data) {
            return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
        }

        const signal = await Signal.create({
            from: user.email,
            to,
            type,
            data: typeof data === 'string' ? data : JSON.stringify(data)
        });

        return NextResponse.json({ success: true, signal });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
