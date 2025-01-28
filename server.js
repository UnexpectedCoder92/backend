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

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nigga';

// Store chat messages and files in memory (replace with a database in production)
let messages = [];
let files = [];
let users = []; // Store registered users

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send existing messages and files to the new user
    socket.emit('messages', messages);
    socket.emit('files', files);

    // Listen for new messages
    socket.on('sendMessage', (message) => {
        const newMessage = {
            id: Date.now().toString(), // Ensure ID is a string
            username: message.username,
            content: message.content,
            timestamp: new Date().toLocaleString(),
        };
        messages.push(newMessage);
        io.emit('newMessage', newMessage); // Broadcast the message to all users
    });

    // Listen for message edits
    socket.on('editMessage', (data) => {
        const { id, content, username } = data;
        const messageIndex = messages.findIndex((msg) => msg.id === id);

        if (messageIndex !== -1 && (username === ADMIN_USERNAME || messages[messageIndex].username === username)) {
            messages[messageIndex].content = content;
            io.emit('updateMessage', messages[messageIndex]); // Broadcast the updated message
        } else {
            console.log('Unauthorized edit attempt');
        }
    });

    // Listen for admin validation
    socket.on('validateAdmin', ({ username, password }, callback) => {
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            callback({ success: true, isAdmin: true });
        } else {
            callback({ success: false });
        }
    });

    // Listen for user login
    socket.on('login', ({ username, password }, callback) => {
        const user = users.find((u) => u.username === username && u.password === password);
        if (user) {
            callback({ success: true, isAdmin: false });
        } else {
            callback({ success: false });
        }
    });

    // Listen for user signup
    socket.on('signup', ({ username, password }, callback) => {
        const userExists = users.some((u) => u.username === username);
        if (userExists) {
            callback({ success: false, message: 'Username already exists' });
        } else {
            users.push({ username, password });
            callback({ success: true, message: 'Signup successful! Please login.' });
        }
    });

    // Listen for message deletions
    socket.on('deleteMessage', (data) => {
        const { id, username } = data;
        const messageIndex = messages.findIndex((msg) => msg.id === id);

        if (messageIndex !== -1 && (username === ADMIN_USERNAME || messages[messageIndex].username === username)) {
            messages = messages.filter((msg) => msg.id !== id);
            io.emit('removeMessage', id); // Broadcast the deleted message ID
        } else {
            console.log('Unauthorized delete attempt');
        }
    });

    // Listen for file uploads
    socket.on('uploadFile', (file) => {
        files.push(file);
        io.emit('newFile', file); // Broadcast the new file to all users
    });

    // Listen for file deletions
    socket.on('deleteFile', (fileId) => {
        files = files.filter((file) => file.id !== fileId);
        io.emit('removeFile', fileId); // Broadcast the deleted file ID
    });

    // Listen for admin actions
    socket.on('clearAllMessages', (username) => {
        if (username === ADMIN_USERNAME) {
            messages = [];
            io.emit('clearAllMessages'); // Broadcast to clear all messages
        } else {
            console.log('Unauthorized clear attempt');
        }
    });

    socket.on('clearAllUploads', (username) => {
        if (username === ADMIN_USERNAME) {
            files = [];
            io.emit('clearAllUploads'); // Broadcast to clear all uploads
        } else {
            console.log('Unauthorized clear attempt');
        }
    });

    socket.on('clearAllAccounts', (username) => {
        if (username === ADMIN_USERNAME) {
            users = [];
            io.emit('clearAllAccounts'); // Broadcast to clear all accounts
        } else {
            console.log('Unauthorized clear attempt');
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
