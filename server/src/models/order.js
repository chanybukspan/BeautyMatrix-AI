import { Schema, model } from 'mongoose';

const orderSchema = new Schema({
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: [true, 'Order must belong to a user'] 
    },
    products: [{
        product: { 
            type: Schema.Types.ObjectId, 
            ref: 'Product', 
            required: true 
        },
        quantity: { type: Number, default: 1 }
    }],
    totalPrice: { type: Number, required: true },
    shippingAddress: { type: String, required: true },
    phone: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'shipped', 'delivered', 'cancelled'], 
        default: 'pending' 
    }
}, { timestamps: true });

export const orderModel = model('Order', orderSchema);