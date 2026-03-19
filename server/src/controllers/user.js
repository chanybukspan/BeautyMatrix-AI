import asyncHandler from 'express-async-handler';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userModel } from "../models/user.js";
import { AppError } from "../utils/appError.js";

// 1. כניסת משתמש (Login)
export const loginUser = asyncHandler(async (req, res, next) => {
    const { email, userName, password } = req.body;

    // חיפוש המשתמש לפי מייל או שם משתמש
    const user = await userModel.findOne({ 
        $or: [
            { email: email?.toLowerCase() }, 
            { userName: userName }
        ] 
    }).select('+password'); // וודאי שבמודל הסיסמה מוגדרת כ-select: false להגנה

    if (!user) {
        return next(new AppError('Invalid login credentials', 401));
    }

    // בדיקת סיסמה
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return next(new AppError('Invalid login credentials', 401));
    }

    // יצירת Token
    const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
    );

    // הסרת הסיסמה מהאובייקט לפני החזרה
    const userData = user.toObject();
    delete userData.password;

    res.json({
        success: true,
        message: "Login successful",
        user: userData,
        token: token
    });
});

// 2. הרשמת משתמש חדש (Register)
// בתוך controllers/user.js (גרסה מקוצרת ומקצועית)
export const registerUser = asyncHandler(async (req, res, next) => {
    const newUser = await userModel.create({
        userName: req.body.userName,
        email: req.body.email,
        password: req.body.password, // ההצפנה תקרה אוטומטית במודל!
        role: req.body.role
    });

    const token = createToken(newUser._id); // פונקציית עזר ליצירת טוקן
    
    res.status(201).json({
        success: true,
        token,
        user: newUser
    });
});

// 3. קבלת כל המשתמשים (Admin Only)
export const getAllUsers = asyncHandler(async (req, res, next) => {
    const users = await userModel.find().select("-password");
    res.json({
        success: true,
        results: users.length,
        users
    });
});

// 4. קבלת פרטי המשתמש המחובר (Profile)
export const getCurrentUser = asyncHandler(async (req, res, next) => {
    // req.user.id מגיע מה-protect middleware
    const user = await userModel.findById(req.user.id).select("-password");
    
    if (!user) {
        return next(new AppError('User not found', 404));
    }
    
    res.json({
        success: true,
        user
    });
});