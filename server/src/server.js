import express from "express";
import cors from "cors"; 
import 'dotenv/config';
import { connect } from "mongoose";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import http from 'http';
import { Server } from 'socket.io';

// Import Routes
import userRouter from './routes/user.js';
import productRouter from './routes/product.js';
import orderRouter from './routes/order.js';
import aiRouter from './routes/ai.js';
import { errorMiddleware } from "../middlewares/errorMiddleware.js";

// Import Socket Logic
import { setupSocket } from './socket/socketHandler.js'; 

const app = express();
const server = http.createServer(app);

// 1. Socket.io Setup
const io = new Server(server, { 
    cors: { 
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST']
    } 
});

// הפעלת לוגיקת הצ'אט (הקוד שהעברת לקובץ הנפרד)
setupSocket(io);

// 2. Security Middlewares
app.use(helmet()); // הגנה על כותרות HTTP
app.use(mongoSanitize()); // מניעת הזרקות NoSQL

const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour'
});

// 3. Global Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api', limiter); // החלת הגבלת בקשות על כל ה-API

// 4. Routes
app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/order', orderRouter);
app.use('/api/ai', aiRouter); // ניסוי מוצרים וסורק AI

// 5. Error Handling - חייב להיות אחרון
app.use(errorMiddleware);

// 6. Database & Server Start
const dbUrl = process.env.MONGODB_URI || process.env.DB_URI;
const port = process.env.PORT || 3000;

connect(dbUrl)
    .then(() => {
        console.log("Database connection successful");
        server.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch(err => {
        console.error("Database connection error:", err);
        process.exit(1);
    });