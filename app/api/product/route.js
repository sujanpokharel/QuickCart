import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import Product from '@/models/Product';
import { getCurrentUser } from '@/lib/auth';
import authSeller from '@/lib/authSeller';

// GET all products or products by seller
export async function GET(request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const sellerId = searchParams.get('sellerId');

        let products;
        if (sellerId) {
            // Get products for a specific seller
            products = await Product.find({ userId: sellerId }).sort({ date: -1 });
        } else {
            // Get all products
            products = await Product.find({}).sort({ date: -1 });
        }

        return NextResponse.json({ success: true, products });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// POST - Add new product (Seller only)
export async function POST(request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        // Verify seller role
        const isSeller = await authSeller();
        if (!isSeller) {
            return NextResponse.json({ success: false, message: 'Not authorized as seller' }, { status: 403 });
        }

        await connectDB();

        const body = await request.json();
        const { name, description, price, offerPrice, image, category } = body;

        if (!name || !description || !price || !offerPrice || !image || !category) {
            return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
        }

        const product = await Product.create({
            userId: user.userId,
            name,
            description,
            price: Number(price),
            offerPrice: Number(offerPrice),
            image,
            category
        });

        return NextResponse.json({ success: true, message: 'Product added successfully', product }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
