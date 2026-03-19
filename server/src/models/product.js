import { Schema, model } from 'mongoose';

const productSchema = new Schema({
    makeupName: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true }, // למשל: Lipstick, Eyeshadow
    hexColor: { type: String }, // שדה חדש לעזור ל-AI לדייק בגוון
    imageUrl: { type: String, required: true },
    price: { type: Number, required: true }
}, { timestamps: true });

export const productModel = model('Product', productSchema);