// server/socket/socketHandler.js
export const setupSocket = (io) => {
    const activeChats = new Map();

    io.on('connection', (socket) => {
        console.log('New client connected: ' + socket.id);

        socket.on('join_room', (roomId) => {
            socket.join(roomId);
            console.log('User joined room: ' + roomId);
        });

        socket.on('send_message', (data) => {
            const { roomId } = data;
            // שידור ההודעה לכל המשתתפים בחדר
            io.to(roomId).emit('receive_message', data);
        });

        socket.on('request_agent', (roomId) => {
            console.log('Agent requested for room: ' + roomId);
            // כאן תוסיפי את הלוגיקה של Nodemailer שכתבנו קודם
            io.to(roomId).emit('agent_requested');
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });
};