const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

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

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send existing messages and files to the new user
    socket.emit('messages', messages);
    socket.emit('files', files);

    // Listen for new messages
    socket.on('sendMessage', (message) => {
        const newMessage = {
            id: Date.now(), // Unique ID for the message
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

    // Listen for file uploads
    socket.on('uploadFile', (fileData) => {
        const { username, filename, description, content } = fileData;
        const filePath = path.join(__dirname, 'uploads', filename);

        // Save the file to the server
        fs.writeFileSync(filePath, content, 'utf-8');

        const newFile = {
            id: Date.now(), // Unique ID for the file
            username,
            filename,
            description,
            fileUrl: `/uploads/${filename}`,
            timestamp: new Date().toLocaleString(),
        };
        files.push(newFile);
        io.emit('newFile', newFile); // Broadcast the new file to all users
    });

    // Listen for file deletions
    socket.on('deleteFile', (fileId) => {
        const file = files.find((f) => f.id === fileId);
        if (file) {
            // Delete the file from the server
            const filePath = path.join(__dirname, 'uploads', file.filename);
            fs.unlinkSync(filePath);

            // Remove the file from the list
            files = files.filter((f) => f.id !== fileId);
            io.emit('removeFile', fileId); // Broadcast the deleted file ID
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
    console.log(`Server running on port ${PORT}`);
});
