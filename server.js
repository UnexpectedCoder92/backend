const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins (replace with your frontend URL in production)
        methods: ['GET', 'POST'],
    },
});

// Store chat messages in memory (replace with a database in production)
let messages = [];

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send existing messages to the new user
    socket.emit('messages', messages);

    // Listen for new messages
    socket.on('sendMessage', (message) => {
        const newMessage = {
            id: Date.now(),
            username: message.username,
            content: message.content,
            timestamp: new Date().toLocaleString(),
        };
        messages.push(newMessage);
        io.emit('newMessage', newMessage); // Broadcast the message to all users
    });

    // Listen for message edits
    socket.on('editMessage', (editedMessage) => {
        const index = messages.findIndex((msg) => msg.id === editedMessage.id);
        if (index !== -1 && messages[index].username === editedMessage.username) {
            messages[index].content = editedMessage.content;
            io.emit('updateMessage', messages[index]); // Broadcast the updated message
        } else {
            console.log('Unauthorized edit attempt');
        }
    });

    // Listen for message deletions
    socket.on('deleteMessage', (data) => {
        const index = messages.findIndex((msg) => msg.id === data.messageId);
        if (index !== -1 && messages[index].username === data.username) {
            messages = messages.filter((msg) => msg.id !== data.messageId);
            io.emit('removeMessage', data.messageId); // Broadcast the deleted message ID
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
