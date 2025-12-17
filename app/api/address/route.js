import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import Address from '@/models/Address';
import { auth } from '@clerk/nextjs/server';

// GET all addresses for the authenticated user
export async function GET(request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();

        const addresses = await Address.find({ userId });

        return NextResponse.json({ success: true, addresses });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// POST - Add new address
export async function POST(request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();

        const body = await request.json();
        const { fullName, phoneNumber, pincode, area, city, state } = body;

        if (!fullName || !phoneNumber || !pincode || !area || !city || !state) {
            return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
        }

        const address = await Address.create({
            userId,
            fullName,
            phoneNumber,
            pincode,
            area,
            city,
            state
        });

        return NextResponse.json({ success: true, message: 'Address added successfully', address }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// DELETE - Remove address
export async function DELETE(request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const addressId = searchParams.get('id');

        if (!addressId) {
            return NextResponse.json({ success: false, message: 'Address ID is required' }, { status: 400 });
        }

        const address = await Address.findById(addressId);

        if (!address) {
            return NextResponse.json({ success: false, message: 'Address not found' }, { status: 404 });
        }

        if (address.userId !== userId) {
            return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
        }

        await Address.findByIdAndDelete(addressId);

        return NextResponse.json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
