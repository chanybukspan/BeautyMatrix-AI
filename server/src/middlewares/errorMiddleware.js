export const errorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    } else {
        // Production mode
        res.status(err.statusCode).json({
            success: false,
            message: err.isOperational ? err.message : 'Something went very wrong'
        });
    }
};