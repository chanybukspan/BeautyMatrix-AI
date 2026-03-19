import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new Schema({
    userName: { 
        type: String, 
        required: [true, 'User name is required'],
        trim: true 
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true,
        lowercase: true,
        trim: true
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: 6,
        select: false // לא יישלף בחיפושים אלא אם נבקש ספציפית
    },
    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    }
}, { timestamps: true });

// הצפנת סיסמה אוטומטית לפני שמירה
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// פונקציית עזר לבדיקת סיסמה (תשמש אותנו ב-Login)
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

export const userModel = model('User', userSchema);