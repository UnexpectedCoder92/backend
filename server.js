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

// Store users, messages, and files in memory (replace with a database in production)
let users = [];
let messages = [];
let files = [];

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for user login
    socket.on('login', (username) => {
        const user = { id: socket.id, username };
        users.push(user);
        io.emit('userList', users);
        socket.emit('messages', messages);
        socket.emit('files', files);
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

    // Listen for file uploads
    socket.on('uploadFile', (file) => {
        files.push(file);
        io.emit('updateFiles', files); // Broadcast the updated file list
    });

    // Listen for file deletions
    socket.on('deleteFile', (fileId) => {
        files = files.filter(file => file.id !== fileId);
        io.emit('removeFile', fileId); // Broadcast the deleted file ID
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
