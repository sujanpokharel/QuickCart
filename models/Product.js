import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    offerPrice: {
        type: Number,
        required: true
    },
    image: {
        type: [String],
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Earphone', 'Headphone', 'Watch', 'Smartphone', 'Laptop', 'Camera', 'Accessories']
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { minimize: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
