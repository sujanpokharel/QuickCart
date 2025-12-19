import mongoose from 'mongoose';

const signalSchema = new mongoose.Schema({
    from: {
        type: String, // email
        required: true
    },
    to: {
        type: String, // email or 'admin'
        required: true
    },
    type: {
        type: String, // 'OFFER', 'ANSWER', 'ICE_CANDIDATE', 'CALL_INVITE', 'CALL_ACCEPTED', 'CALL_REJECTED', 'CALL_ENDED'
        required: true
    },
    data: {
        type: String, // Stringified JSON data
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // Auto-delete after 5 minutes
    }
});

const Signal = mongoose.models.Signal || mongoose.model('Signal', signalSchema);

export default Signal;
