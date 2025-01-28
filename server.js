const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database'); // Import the database utility

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins (replace with your frontend URL in production)
        methods: ['GET', 'POST'],
    },
});

// Initialize the database
db.initializeDatabase();

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send existing messages to the new user
    const messages = db.getMessages();
    socket.emit('messages', messages);

    // Listen for new messages
    socket.on('sendMessage', (message) => {
        const newMessage = {
            id: Date.now().toString(), // Ensure ID is a string
            username: message.username,
            content: message.content,
            timestamp: new Date().toLocaleString(),
        };
        db.addMessage(newMessage.id, newMessage.username, newMessage.content, newMessage.timestamp);
        io.emit('newMessage', newMessage); // Broadcast the message to all users
    });

    // Listen for message edits
    socket.on('editMessage', (data) => {
        const { id, content, username } = data;
        const success = db.editMessage(id, content, username);
        if (success) {
            const updatedMessage = { id, username, content };
            io.emit('updateMessage', updatedMessage); // Broadcast the updated message
        } else {
            console.log('Unauthorized edit attempt');
        }
    });

    // Listen for message deletions
    socket.on('deleteMessage', (data) => {
        const { id, username } = data;
        const success = db.deleteMessage(id, username);
        if (success) {
            io.emit('removeMessage', id); // Broadcast the deleted message ID
        } else {
            console.log('Unauthorized delete attempt');
        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
