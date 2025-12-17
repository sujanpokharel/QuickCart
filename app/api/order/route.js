import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { getCurrentUser } from '@/lib/auth';

// GET orders for the authenticated user
export async function GET(request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();

        const orders = await Order.find({ userId: user.userId })
            .populate('items.product')
            .sort({ date: -1 });

        return NextResponse.json({ success: true, orders });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// POST - Create new order
export async function POST(request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();

        const body = await request.json();
        const { items, address } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ success: false, message: 'Cart is empty' }, { status: 400 });
        }

        if (!address) {
            return NextResponse.json({ success: false, message: 'Address is required' }, { status: 400 });
        }

        // Calculate total amount
        let amount = 0;
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (product) {
                amount += product.offerPrice * item.quantity;
            }
        }

        // Add tax (2%)
        amount = amount + Math.floor(amount * 0.02);

        const order = await Order.create({
            userId: user.userId,
            items,
            amount,
            address
        });

        // Populate the product details before sending response
        await order.populate('items.product');

        return NextResponse.json({ success: true, message: 'Order placed successfully', order }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
