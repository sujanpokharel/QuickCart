import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema({
    type: {
        type: String, // 'hero', 'featured', 'banner'
        required: true,
        enum: ['hero', 'featured', 'banner']
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String, // Used as 'offer' for hero, 'description' for others
        default: ''
    },
    image: {
        type: String, // Main image
        required: true
    },
    secondaryImage: {
        type: String, // Optional second image (e.g. for Banner)
        default: ''
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false // Optional, but recommended for Buy Now
    },
    buttonText: {
        type: String,
        default: 'Buy Now'
    },
    order: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Feature = mongoose.models.Feature || mongoose.model('Feature', featureSchema);
export default Feature;
