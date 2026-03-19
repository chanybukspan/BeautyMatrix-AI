import Joi from 'joi';

export const registerSchema = Joi.object({
    userName: Joi.string().min(2).max(30).required().messages({
        'string.empty': 'חובה להזין שם משתמש',
        'string.min': 'שם משתמש חייב להיות לפחות 2 תווים',
        'any.required': 'שם משתמש הוא שדה חובה'
    }),
    email: Joi.string().email().lowercase().required().messages({
        'string.email': 'כתובת המייל אינה תקינה',
        'string.empty': 'חובה להזין אימייל',
        'any.required': 'אימייל הוא שדה חובה'
    }),
    password: Joi.string().min(6).max(20).required().messages({
        'string.min': 'הסיסמה חייבת להכיל 6-20 תווים',
        'string.empty': 'חובה להזין סיסמה',
        'any.required': 'סיסמה היא שדה חובה'
    }),
    role: Joi.string().valid('user', 'admin').default('user')
});

export const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().messages({
        'string.email': 'כתובת המייל אינה תקינה'
    }),
    userName: Joi.string(),
    password: Joi.string().required().messages({
        'string.empty': 'חובה להזין סיסמה',
        'any.required': 'סיסמה היא שדה חובה'
    })
}).or('email', 'userName').messages({
    'object.missing': 'חובה להזין אימייל או שם משתמש'
});