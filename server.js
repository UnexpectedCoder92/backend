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

// Store chat messages and files in memory (replace with a database in production)
let messages = [];
let files = [];

// Admin credentials (hardcoded for simplicity)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'nigga';

// Validate username
function validateUsername(username) {
    return username.length >= 3 && username.length <= 15;
}

// Authenticate user
function authenticate(username, password) {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return { username, isAdmin: true };
    }
    return null;
}

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send existing messages and files to the new user
    socket.emit('messages', messages);
    socket.emit('files', files);

    // Listen for login attempts
    socket.on('login', (data) => {
        const { username, password } = data;
        const user = authenticate(username, password);

        if (user) {
            socket.emit('loginSuccess', user);
        } else {
            socket.emit('loginError', 'Invalid credentials');
        }
    });

    // Listen for new messages
    socket.on('sendMessage', (data) => {
        const { username, content } = data;
        if (username && content) {
            const newMessage = {
                id: Date.now().toString(),
                username,
                content,
                timestamp: new Date().toLocaleString(),
            };
            messages.push(newMessage);
            io.emit('newMessage', newMessage); // Broadcast the message to all users
        }
    });

    // Listen for message edits
    socket.on('editMessage', (data) => {
        const { id, content, username, isAdmin } = data;
        const messageIndex = messages.findIndex((msg) => msg.id === id);

        if (messageIndex !== -1 && (isAdmin || messages[messageIndex].username === username)) {
            messages[messageIndex].content = content;
            io.emit('updateMessage', messages[messageIndex]); // Broadcast the updated message
        }
    });

    // Listen for message deletions
    socket.on('deleteMessage', (data) => {
        const { id, username, isAdmin } = data;
        const messageIndex = messages.findIndex((msg) => msg.id === id);

        if (messageIndex !== -1 && (isAdmin || messages[messageIndex].username === username)) {
            messages = messages.filter((msg) => msg.id !== id);
            io.emit('removeMessage', id); // Broadcast the deleted message ID
        }
    });

    // Listen for file uploads
    socket.on('uploadFile', (data) => {
        const { username, filename, description, content } = data;
        if (username && filename && content) {
            const newFile = {
                id: Date.now().toString(),
                username,
                filename,
                description,
                content,
                timestamp: new Date().toLocaleString(),
            };
            files.push(newFile);
            io.emit('newFile', newFile); // Broadcast the new file to all users
        }
    });

    // Listen for file deletions
    socket.on('deleteFile', (data) => {
        const { fileId, username, isAdmin } = data;
        const fileIndex = files.findIndex((file) => file.id === fileId);

        if (fileIndex !== -1 && (isAdmin || files[fileIndex].username === username)) {
            files = files.filter((file) => file.id !== fileId);
            io.emit('removeFile', fileId); // Broadcast the deleted file ID
        }
    });

    // Listen for admin actions
    socket.on('clearAllMessages', (data) => {
        const { isAdmin } = data;
        if (isAdmin) {
            messages = [];
            io.emit('clearAllMessages'); // Broadcast to clear all messages
        }
    });

    socket.on('clearAllUploads', (data) => {
        const { isAdmin } = data;
        if (isAdmin) {
            files = [];
            io.emit('clearAllUploads'); // Broadcast to clear all uploads
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
