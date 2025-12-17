import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import Feature from '@/models/feature';
import { getCurrentUser } from '@/lib/auth';
import authAdmin from '@/lib/authAdmin';

// GET all features
export async function GET(request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        let query = {};
        if (type) {
            query.type = type;
        }

        const features = await Feature.find(query).sort({ order: 1, createdAt: -1 });
        return NextResponse.json({ success: true, features });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// POST - Add new feature (Admin only)
export async function POST(request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const isAdmin = await authAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: 'Not authorized as admin' }, { status: 403 });
        }

        await connectDB();
        const body = await request.json();
        const { type, title, description, image, secondaryImage, product, buttonText } = body;

        // Validation
        if (!type || !title || !image) {
            return NextResponse.json({ success: false, message: 'Type, title, and image are required' }, { status: 400 });
        }

        const feature = await Feature.create({
            type,
            title,
            description,
            image,
            secondaryImage,
            product: product || null,
            buttonText
        });

        return NextResponse.json({ success: true, message: 'Feature added successfully', feature }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// DELETE - Remove feature (Admin only)
export async function DELETE(request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const isAdmin = await authAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: 'Not authorized as admin' }, { status: 403 });
        }

        await connectDB();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });
        }

        await Feature.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: 'Feature deleted successfully' });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
