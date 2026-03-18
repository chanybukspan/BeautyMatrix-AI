import express from "express"
import cors from "cors" 
import 'dotenv/config';
import { connect } from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import http from 'http';
import { Server } from 'socket.io';
import nodemailer from 'nodemailer';
import { errorMiddleware } from "../middlewares/errorMiddleware.js";
// Import routes
import userRouter from './routes/user.js';
import orderRouter from './routes/order.js';
import productRouter from './routes/product.js';
app.use(errorMiddleware);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.MONGODB_URI || process.env.DB_URI; 
const port = process.env.PORT || 3000;
const app=express().use(express.json());// Allow the server to handle JSON data
app.use(cors())// Enable Cross-Origin Resource Sharing

// Create HTTP server and Socket.IO
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { 
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    } 
});

// Serve static files from server directory (for api-docs.html)
app.use(express.static(path.join(__dirname, '..')));

// Chat functionality
// רשימת מיילים ושמות נציגים
const agentEmails = [
    process.env.EMAIL_USER,
    'a0548439021@gmail.com'
];
const agentNames = [
    'נציג ראשי',
    'אסתר'
];

const activeChats = new Map();

// טעינת context של שיחות
function getChatContext(roomId) {
    if (!activeChats.has(roomId)) {
        activeChats.set(roomId, { 
            mode: 'bot', 
            status: 'idle',
            messages: [],
            agentName: null
        });
    }
    return activeChats.get(roomId);
}

// שמירת הודעות בקונטקסט של הצ'אט
function addToChatContext(roomId, role, text) {
    const chat = getChatContext(roomId);
    chat.messages.push({ role, content: text });
    // שמור רק את 10 ההודעות האחרונות כדי לא להעמיס
    if (chat.messages.length > 10) {
        chat.messages.shift();
    }
}

// הגדרת כלי דואר מייל
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER.trim(),
        pass: process.env.EMAIL_PASS.trim()
    }
});

// בדיקת הגדרות המייל בעת הפתחת השרת
console.log(`Email configured: ${process.env.EMAIL_USER ? 'YES' : 'NO'}`);
console.log(`Email password configured: ${process.env.EMAIL_PASS ? 'YES' : 'NO'}`);

// פונקציה לשליחת מיילים לנציגים
async function sendAgentEmail(roomId) {
    console.log(`[SEND_AGENT_EMAIL] Starting for room ${roomId}`);
    console.log(`[SEND_AGENT_EMAIL] Agent emails:`, agentEmails);
    
    for (let i = 0; i < agentEmails.length; i++) {
        const email = agentEmails[i];
        const name = agentNames[i];
        
        // דלג על מיילים ריקים
        if (!email) {
            console.log(`[SEND_AGENT_EMAIL] Skipping empty email at index ${i}`);
            continue;
        }
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `דרוש נציג - צ'אט ${roomId}`,
            html: `
                <h2>שלום ${name}!</h2>
                <p>יש לקוח שמחכה לעזרה בצ'אט.</p>
                <p><strong>מספר חדר: ${roomId}</strong></p>
                <a href="http://localhost:5173/agent/${roomId}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    לחץ כאן להצטרפות לצ'אט
                </a>
            `
        };
        
        try {
            console.log(`[SEND_AGENT_EMAIL] Attempting to send email to ${email}...`);
            const result = await transporter.sendMail(mailOptions);
            console.log(`[SEND_AGENT_EMAIL] ✅ מייל נשלח בהצלחה ל-${name} (${email}) עבור חדר ${roomId}. Message ID: ${result.messageId}`);
        } catch (error) {
            console.error(`[SEND_AGENT_EMAIL] ❌ שגיאה בשליחת מייל ל-${email}:`, error.message);
            console.error(`[SEND_AGENT_EMAIL] Full error:`, error);
        }
    }
}

io.on('connection', (socket) => {
    console.log(`[CONNECTION] User ${socket.id} connected`);
    
    socket.on('join_room', (roomId) => {
        console.log(`[JOIN_ROOM] User ${socket.id} joining room ${roomId}`);
        socket.join(roomId);
        const chat = getChatContext(roomId);
        if (chat.messages.length === 0) {
            // זו חדרה חדשה
            console.log(`[NEW_ROOM] Created new room ${roomId}`);
        } else {
            console.log(`[EXISTING_ROOM] Room ${roomId} already exists`);
        }
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('send_message', async (data) => {
        const { text, roomId, sender } = data;
        const chat = getChatContext(roomId);
        
        console.log(`[SEND_MESSAGE] roomId: ${roomId}, sender: ${sender}, text: ${text}`);

        // שמור את הודעת המשתמש בקונטקסט
        if (sender === 'user') {
            addToChatContext(roomId, 'user', text);
        }

        // שידור מיידי לכולם (כולל הנציג והלקוח)
        io.to(roomId).emit('receive_message', { 
            text, 
            sender, 
            timestamp: Date.now() 
        });
    });

    socket.on('agent_claim_chat', ({ roomId, agentName }, callback) => {
        const chat = getChatContext(roomId);
        if (chat) {
            // בדוק אם כבר מישהו טען את השיחה
            if (chat.agentName) {
                callback({ success: false, reason: 'already_claimed' });
                return;
            }
            chat.mode = 'human'; // מפסיק את ה-AI
            chat.status = 'active';
            chat.agentName = agentName; // שמירת שם הנציג
            
            // הצטרפות לחדר בשרת - קריטי!
            socket.join(roomId); 
            
            callback({ success: true });
            io.to(roomId).emit('agent_joined', { agentName });
            console.log(`Agent ${agentName} is now handling room ${roomId}`);
        } else {
            callback({ success: false });
        }
    });

    socket.on('typing', (data) => {
        io.to(data.roomId).emit('display_typing', data);
    });

    socket.on('close_chat', (roomId) => {
        // נקה את הצאט מה-activeChats
        if (activeChats.has(roomId)) {
            activeChats.delete(roomId);
            console.log(`[CLOSE_CHAT] Chat ${roomId} has been closed and cleaned up`);
        }
        
        // הודע לכל מי שבחדר שהצאט סגור
        io.to(roomId).emit('chat_closed');
        
        // הנציג יעזוב מהחדר
        socket.leave(roomId);
    });

    socket.on('request_agent', async (roomId) => {
        console.log(`[REQUEST_AGENT] Received request for room ${roomId}`);
        const chat = getChatContext(roomId);
        if (chat) {
            console.log(`[REQUEST_AGENT] Chat status: ${chat.status}`);
            // שלח מיילים רק אם עדיין לא בקשנו נציג
            if (chat.status === 'idle') {
                chat.status = 'waiting_for_agent';
                chat.mode = 'human'; // הפסקת מענה AI מיידי
                io.to(roomId).emit('agent_requested');
                console.log(`[REQUEST_AGENT] Status changed to waiting_for_agent, sending emails...`);
                // שליחה מיילים לנציגים
                await sendAgentEmail(roomId);
                console.log(`[REQUEST_AGENT] Emails sent for room ${roomId}`);
            } else {
                console.log(`[REQUEST_AGENT] Chat status is ${chat.status}, not idle - skipping email`);
            }
        } else {
            console.log(`[REQUEST_AGENT] Chat not found for room ${roomId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);
        // ניתן להוסיף לוגיקה לניקיון של inactive rooms
    });
});

// 1. Connection to Database
const connectToDB=async()=>{
    try {
        await connect(dbUrl);
        console.log("Connected to MongoDB successfully");
    } catch (err) {
        console.error("Database connection error:", err);
    }
};
connectToDB();

// 2. Routes
app.get('/', (req, res) => {
    res.json({ 
        message: "MakeUp Store API is running!",
        endpoints: {
            products: "/api/product",
            users: "/api/user",
            orders: "/api/order"
        },
        documentation: "/api-docs.html"
    });
});

// Serve API documentation
app.get('/api-docs.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'api-docs.html'));
});
app.use('/api/user', userRouter);
app.use('/api/order', orderRouter);
app.use('/api/product', productRouter);

// 3. Start the server
server.listen(port,()=>{
console.log(`Server is running on port ${port}`)})

