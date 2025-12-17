import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import Product from '@/models/Product';
import { auth } from '@clerk/nextjs/server';
import authSeller from '@/lib/authSeller';

// GET single product by ID
export async function GET(request, { params }) {
    try {
        await connectDB();

        const { id } = await params;
        const product = await Product.findById(id);

        if (!product) {
            return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, product });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// DELETE product by ID (Seller only - must own the product)
export async function DELETE(request, { params }) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        // Verify seller role
        const isSeller = await authSeller(userId);
        if (!isSeller) {
            return NextResponse.json({ success: false, message: 'Not authorized as seller' }, { status: 403 });
        }

        await connectDB();

        const { id } = await params;
        const product = await Product.findById(id);

        if (!product) {
            return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
        }

        // Check if the seller owns this product
        if (product.userId !== userId) {
            return NextResponse.json({ success: false, message: 'Not authorized to delete this product' }, { status: 403 });
        }

        await Product.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// PUT - Update product (Seller only - must own the product)
export async function PUT(request, { params }) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        // Verify seller role
        const isSeller = await authSeller(userId);
        if (!isSeller) {
            return NextResponse.json({ success: false, message: 'Not authorized as seller' }, { status: 403 });
        }

        await connectDB();

        const { id } = await params;
        const product = await Product.findById(id);

        if (!product) {
            return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
        }

        // Check if the seller owns this product
        if (product.userId !== userId) {
            return NextResponse.json({ success: false, message: 'Not authorized to update this product' }, { status: 403 });
        }

        const body = await request.json();
        const updatedProduct = await Product.findByIdAndUpdate(id, body, { new: true });

        return NextResponse.json({ success: true, message: 'Product updated successfully', product: updatedProduct });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
