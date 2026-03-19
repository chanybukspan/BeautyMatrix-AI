import asyncHandler from 'express-async-handler';
import { AppError } from '../utils/appError.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { productModel } from '../models/product.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const tryOnProduct = asyncHandler(async (req, res, next) => {
    const { userImageUrl, productId } = req.body;

    if (!userImageUrl || !productId) {
        return next(new AppError('User image URL and Product ID are required', 400));
    }

    // שליפת נתוני המוצר כדי שה-AI ידע איזה גוון וקטגוריה להחיל
    const product = await productModel.findById(productId);
    if (!product) {
        return next(new AppError('Product not found', 404));
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // בניית הנחיה (Prompt) מקצועית
        const prompt = `
            Task: Virtual Makeup Try-On.
            Instruction: Take the person in the provided user image and apply the makeup product from the description.
            Product Category: ${product.category}.
            Product Name: ${product.makeupName}.
            Color/Shade: ${product.hexColor || 'natural'}.
            Requirements: The application must look professional, realistic, and match the original lighting of the user photo.
            Return only the modified image.
        `;

        // שליחת הבקשה ל-Gemini
        // הערה: בשימוש אמיתי ב-SDK יש להמיר את ה-URL ל-InlineData או להשתמש ב-File API של גוגל
        const result = await model.generateContent([prompt, userImageUrl]);
        const response = await result.response;
        
        res.json({
            success: true,
            message: "Virtual try-on completed",
            resultImageUrl: response.text() // כאן יחזור ה-URL או ה-Base64 של התמונה החדשה
        });
    } catch (error) {
        return next(new AppError('AI processing failed: ' + error.message, 500));
    }
});