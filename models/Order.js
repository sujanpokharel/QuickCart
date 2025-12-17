import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    amount: {
        type: Number,
        required: true
    },
    address: {
        fullName: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        pincode: { type: String, required: true },
        area: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true }
    },
    status: {
        type: String,
        default: 'Order Placed',
        enum: ['Order Placed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']
    },
    paymentMethod: {
        type: String,
        default: 'COD',
        enum: ['COD', 'Online']
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { minimize: false });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;
