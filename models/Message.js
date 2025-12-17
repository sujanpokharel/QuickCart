import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        default: 'Unread', // 'Unread', 'Read', 'Replied'
    },
    reply: {
        type: String,
        default: ''
    },
    replyImageUrl: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Force model recompilation to pick up schema changes in development
if (mongoose.models.Message) {
    delete mongoose.models.Message;
}

const Message = mongoose.model('Message', messageSchema);

export default Message;
