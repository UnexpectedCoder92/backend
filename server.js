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

// Store users, messages, and private messages in memory (replace with a database in production)
let users = [];
let messages = [];
let privateMessages = [];

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for user login
    socket.on('login', (username) => {
        const user = { id: socket.id, username };
        users.push(user);
        io.emit('userList', users);
        socket.emit('messages', messages);
        socket.emit('privateMessages', privateMessages.filter(msg => msg.to === username || msg.from === username));
    });

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

    // Listen for private messages
    socket.on('sendPrivateMessage', (message) => {
        const newPrivateMessage = {
            id: Date.now(),
            from: message.from,
            to: message.to,
            content: message.content,
            timestamp: new Date().toLocaleString(),
        };
        privateMessages.push(newPrivateMessage);
        io.to(users.find(user => user.username === message.to)?.id).emit('newPrivateMessage', newPrivateMessage);
        socket.emit('newPrivateMessage', newPrivateMessage);
    });

    // Listen for message edits
    socket.on('editMessage', (editedMessage) => {
        const index = messages.findIndex((msg) => msg.id === editedMessage.id);
        if (index !== -1) {
            messages[index].content = editedMessage.content;
            io.emit('updateMessage', messages[index]); // Broadcast the updated message
        }
    });

    // Listen for message deletions
    socket.on('deleteMessage', (messageId) => {
        messages = messages.filter((msg) => msg.id !== messageId);
        io.emit('removeMessage', messageId); // Broadcast the deleted message ID
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        users = users.filter(user => user.id !== socket.id);
        io.emit('userList', users);
        console.log('A user disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
