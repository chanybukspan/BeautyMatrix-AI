import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
    // 1. בדיקה אם קיים Header של Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = new Error("גישה נדחתה, לא נשלח Token");
        error.statusCode = 401;
        return next(error);
    }

    // 2. חילוץ ה-Token
    const token = authHeader.split(' ')[1];

    try {
        // 3. אימות ה-Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // 4. הזרקת פרטי המשתמש לתוך אובייקט ה-Request
        req.user = decoded;
        next();
    } catch (err) {
        const error = new Error("Token לא בתוקף או פג תוקף");
        error.statusCode = 401;
        return next(error);
    }
};

// Middleware לבדיקה אם המשתמש הוא אדמין
export const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        const error = new Error("גישה חסומה: נדרשות הרשאות מנהל");
        error.statusCode = 403;
        return next(error);
    }
};