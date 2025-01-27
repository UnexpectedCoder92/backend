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

        if (messageIndex !== -1 && messages[messageIndex].username === username) {
            messages[messageIndex].content = content;
            io.emit('updateMessage', messages[messageIndex]); // Broadcast the updated message
        } else {
            console.log('Unauthorized edit attempt');
        }
    });

    // Listen for message deletions
    socket.on('deleteMessage', (data) => {
        const { id, username } = data;
        const messageIndex = messages.findIndex((msg) => msg.id === id);

        if (messageIndex !== -1 && messages[messageIndex].username === username) {
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
