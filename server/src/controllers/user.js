import { userModel } from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userSchema } from "../validators/userValidator.js"; 

// 1. כניסת משתמש (Login)
export const loginUser = async (req, res, next) => { // הוספנו next
    try {
        const { email, userName, password } = req.body;

        // בדיקה בסיסית (אפשר גם כאן להשתמש ב-Joi אם רוצים)
        if ((!email && !userName) || !password) {
            const err = new Error("חובה להזין מייל/שם משתמש וסיסמה");
            err.statusCode = 400;
            return next(err);
        }

        const user = await userModel.findOne({ $or: [{ email }, { userName }] });
        if (!user) {
            const err = new Error("משתמש לא נמצא");
            err.statusCode = 401;
            return next(err);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const err = new Error("סיסמה שגויה");
            err.statusCode = 401;
            return next(err);
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        const userData = user.toObject();
        delete userData.password;

        res.json({
            success: true,
            message: "התחברת בהצלחה",
            user: userData,
            token: token
        });
    } catch (err) {
        next(err); // עובר ל-errorMiddleware
    }
};

// 2. קבלת כל המשתמשים (לשימוש אדמין)
export const getAllUsers = async (req, res, next) => { // הוספנו next
    try {
        const users = await userModel.find().select("-password");
        res.json(users);
    } catch (err) {
        next(err);
    }
};

// 3. הרשמת משתמש חדש (Register)
export const registerUser = async (req, res, next) => {
    try {
        // אימות Joi
        const { error } = userSchema.validate(req.body);
        if (error) {
            const validationError = new Error(error.details[0].message);
            validationError.statusCode = 400;
            validationError.title = "Validation Error";
            return next(validationError);
        }

        const { userName, email, password, role } = req.body;
        
        const alreadyExists = await userModel.findOne({ email });
        if (alreadyExists) {
            const conflictError = new Error("משתמש עם כתובת מייל זו כבר קיים במערכת");
            conflictError.statusCode = 409;
            return next(conflictError);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new userModel({
            userName,
            email,
            password: hashedPassword,
            role: role || 'user'
        });
        
        await newUser.save();

        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        const { password: pw, ...userData } = newUser._doc;
        res.status(201).json({
            success: true,
            user: userData,
            token: token
        });
    } catch (error) {
        next(error);
    }
};