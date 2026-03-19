import Joi from 'joi';

export const productSchema = Joi.object({
    name: Joi.string().min(3).required().messages({
        'string.empty': 'שם המוצר חובה',
        'string.min': 'שם המוצר חייב להיות לפחות 3 תווים'
    }),
    price: Joi.number().positive().required().messages({
        'number.base': 'המחיר חייב להיות מספר',
        'number.positive': 'המחיר חייב להיות גבוה מ-0'
    }),
    description: Joi.string().allow(''), // אופציונלי
    category: Joi.string().required()
});