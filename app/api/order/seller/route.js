import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { getCurrentUser } from '@/lib/auth';
import authSeller from '@/lib/authSeller';

// GET orders for seller (orders containing their products)
export async function GET(request) {
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

        // Get all products by this seller
        const sellerProducts = await Product.find({ userId: user.userId });
        const sellerProductIds = sellerProducts.map(p => p._id);

        // Find all orders that contain at least one product from this seller
        const orders = await Order.find({
            'items.product': { $in: sellerProductIds }
        })
            .populate('items.product')
            .sort({ date: -1 });

        // Filter order items to only include seller's products
        const sellerOrders = orders.map(order => {
            const sellerItems = order.items.filter(item =>
                item.product && sellerProductIds.some(id => id.equals(item.product._id))
            );

            // Calculate amount for seller's items only
            const sellerAmount = sellerItems.reduce((sum, item) => {
                return sum + (item.product.offerPrice * item.quantity);
            }, 0);

            return {
                _id: order._id,
                items: sellerItems,
                amount: sellerAmount,
                address: order.address,
                status: order.status,
                paymentMethod: order.paymentMethod,
                isPaid: order.isPaid,
                date: order.date
            };
        }).filter(order => order.items.length > 0);

        return NextResponse.json({ success: true, orders: sellerOrders });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// PUT - Update order status (Seller only)
export async function PUT(request) {
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
        const { orderId, status } = body;

        if (!orderId || !status) {
            return NextResponse.json({ success: false, message: 'Order ID and status are required' }, { status: 400 });
        }

        const validStatuses = ['Order Placed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
        }

        const order = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        ).populate('items.product');

        if (!order) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Order status updated', order });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
