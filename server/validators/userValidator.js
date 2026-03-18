import Joi from 'joi';

export const userSchema = Joi.object({
    userName: Joi.string().min(2).max(30).required().messages({
        'string.empty': 'חובה להזין שם משתמש',
        'string.min': 'שם משתמש חייב להיות לפחות 2 תווים'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'כתובת המייל אינה תקינה'
    }),
    password: Joi.string().min(6).max(20).required().messages({
        'string.min': 'הסיסמה חייבת להכיל 6-20 תווים'
    }),
    role: Joi.string().valid('user', 'admin').default('user')
});