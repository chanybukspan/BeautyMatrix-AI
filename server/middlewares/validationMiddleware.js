export const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false }); // abortEarly: false מציג את כל השגיאות בבת אחת
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const err = new Error(errorMessage);
            err.statusCode = 400;
            err.title = "Validation Error";
            return next(err);
        }
        next();
    };
};