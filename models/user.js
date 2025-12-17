import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    isSeller: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cartItems: {
        type: Object,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { minimize: false });

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;