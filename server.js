// Import required modules
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(cors());

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins (replace with your frontend URL in production)
        methods: ['GET', 'POST'],
    },
});

// Store chat messages in memory (replace with a database in production)
let messages = [];

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send existing messages to the new user
    socket.emit('messages', messages);

    // Listen for new messages
    socket.on('sendMessage', (message) => {
        const newMessage = {
            id: Date.now(), // Unique ID for the message
            username: message.username,
            content: message.content,
            timestamp: new Date().toLocaleString(), // Timestamp for the message
        };
        messages.push(newMessage); // Add the message to the array
        io.emit('newMessage', newMessage); // Broadcast the message to all users
    });

    // Listen for message edits
    socket.on('editMessage', (editedMessage) => {
        const index = messages.findIndex((msg) => msg.id === editedMessage.id);
        if (index !== -1) {
            messages[index].content = editedMessage.content; // Update the message content
            io.emit('updateMessage', messages[index]); // Broadcast the updated message
        }
    });

    // Listen for message deletions
    socket.on('deleteMessage', (messageId) => {
        messages = messages.filter((msg) => msg.id !== messageId); // Remove the message
        io.emit('removeMessage', messageId); // Broadcast the deleted message ID
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 5000; // Use Render's PORT environment variable
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); // Use PORT instead of port
});
