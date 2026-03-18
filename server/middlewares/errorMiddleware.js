export const errorMiddleware = (err,req,res,next)=>{
    const statusCode=err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        title: err.title || "Server Error",
        message: err.message || "משהו השתבש בשרת",
        stack: process.env.NODE_ENV ==='production' ? null :err.stack
    });
};