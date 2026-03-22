require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');

// רשימת מיילים ושמות נציגים
const agentEmails = [
    process.env.EMAIL_USER,
    'a0548439021@gmail.com'
];
const agentNames = [
    'נציג ראשי',
    'אסתר'
];

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { 
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    } 
});

// Root handler
app.get('/', (req, res) => {
    res.send('Chat Server is running on port 3000. Connect via Socket.io from http://localhost:3000');
});

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
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// פונקציה לשליחת מיילים לנציגים
async function sendAgentEmail(roomId) {
    for (let i = 0; i < agentEmails.length; i++) {
        const email = agentEmails[i];
        const name = agentNames[i];
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `דרוש נציג - צ'אט ${roomId}`,
            html: `
                <h2>שלום ${name}!</h2>
                <p>יש לקוח שמחכה לעזרה בצ'אט.</p>
                <p><strong>מספר חדר: ${roomId}</strong></p>
                <a href="http://localhost:3000/agent/${roomId}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    לחץ כאן להצטרפות לצ'אט
                </a>
            `
        };
        
        try {
            await transporter.sendMail(mailOptions);
            console.log(`מייל נשלח בהצלחה ל-${name} (${email}) עבור חדר ${roomId}`);
        } catch (error) {
            console.error(`שגיאה בשליחת מייל ל-${email}:`, error);
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
        const chat = getChatContext(roomId);
        if (chat) {
            // שלח מיילים רק אם עדיין לא בקשנו נציג
            if (chat.status === 'idle') {
                chat.status = 'waiting_for_agent';
                chat.mode = 'human'; // הפסקת מענה AI מיידי
                io.to(roomId).emit('agent_requested');
                // שליחה מיילים לנציגים
                await sendAgentEmail(roomId);
                console.log(`Agent requested for room ${roomId} - AI disabled`);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);
        // ניתן להוסיף לוגיקה לניקיון של inactive rooms
    });
});

server.listen(3003, () => console.log('Server running on port 3003'));