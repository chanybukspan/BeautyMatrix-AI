import Joi from 'joi';

export const orderSchema = Joi.object({
    products: Joi.array().items(
        Joi.object({
            product: Joi.string().hex().length(24).required().messages({
                'string.length': 'מזהה מוצר לא תקין'
            }),
            quantity: Joi.number().integer().min(1).required().messages({
                'number.min': 'כמות חייבת להיות לפחות 1'
            })
        })
    ).min(1).required().messages({
        'array.min': 'הזמנה חייבת להכיל לפחות מוצר אחד'
    }),
    shippingAddress: Joi.string().min(5).required().messages({
        'string.empty': 'חובה להזין כתובת למשלוח'
    }),
    phone: Joi.string().pattern(/^[0-9]{9,10}$/).required().messages({
        'string.pattern.base': 'מספר טלפון לא תקין'
    })
});