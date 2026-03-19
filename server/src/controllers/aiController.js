import asyncHandler from 'express-async-handler';
import { AppError } from '../utils/appError.js';
import { v2 as cloudinary } from 'cloudinary';
import { productModel } from '../models/product.js';

// קונפיגורציה של Cloudinary (שימי ב-.env שלך)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const tryOnProduct = asyncHandler(async (req, res, next) => {
    const { userImageUrl, productId, hexColor } = req.body;

    if (!userImageUrl || !productId) {
        return next(new AppError('נתונים חסרים לביצוע הניסוי', 400));
    }

    const product = await productModel.findById(productId);
    if (!product) return next(new AppError('מוצר לא נמצא', 404));

    try {
        // 1. העלאת תמונת המשתמשת ל-Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(userImageUrl, {
            folder: "user_try_on"
        });

        const publicId = uploadResponse.public_id;
        const cleanHex = (hexColor || product.hexColor || '#ff0000').replace('#', '');

        // 2. יצירת טרנספורמציה חכמה (Generative Recolor)
        // הקוד הזה אומר ל-Cloudinary: "תמצא את השפתיים/פנים ותצבע אותן ב-Hex שנבחר"
        const prompt = product.category === 'Lipstick' ? 'lips' : 'face cheeks';
        
        const resultUrl = cloudinary.url(publicId, {
            transformation: [
                { effect: `gen_recolor:prompt_${prompt};to_color_${cleanHex}` },
                { quality: "auto", fetch_format: "auto" }
            ]
        });

        res.json({
            success: true,
            message: "Virtual try-on generated successfully",
            transformedImage: resultUrl // זו התמונה הסופית שה-Frontend יציג!
        });

    } catch (error) {
        console.error("Cloudinary/AI Error:", error);
        return next(new AppError('נכשלו עיבוד התמונה והחלפת הצבע', 500));
    }
});