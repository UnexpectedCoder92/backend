const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Server-Side Storage
let messages = [];
let files = [];
let users = [];
const ADMIN = { username: 'admin', password: 'hello' };

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Initial data sync
    socket.emit('updateMessages', messages);
    socket.emit('updateFiles', files);

    // Authentication
    socket.on('auth', ({ action, username, password }, callback) => {
        if (action === 'signup') {
            if (users.some(u => u.username === username)) {
                return callback({ success: false, message: 'Username exists' });
            }
            users.push({ username, password });
        }

        const user = username === ADMIN.username ? ADMIN : users.find(u => u.username === username);
        if (!user || user.password !== password) {
            return callback({ success: false, message: 'Invalid credentials' });
        }

        callback({ 
            success: true,
            isAdmin: username === ADMIN.username
        });
    });

    // Message Handling
    socket.on('sendMessage', ({ content, username }) => {
        const message = {
            id: Date.now().toString(),
            username,
            content,
            timestamp: new Date().toLocaleString()
        };
        messages.push(message);
        io.emit('updateMessages', messages);
    });

    socket.on('editMessage', ({ messageId, newContent, username }) => {
        const message = messages.find(m => m.id === messageId);
        if (message && (message.username === username || username === ADMIN.username)) {
            message.content = newContent;
            io.emit('updateMessages', messages);
        }
    });

    socket.on('deleteMessage', ({ messageId }) => {
        messages = messages.filter(m => m.id !== messageId);
        io.emit('updateMessages', messages);
    });

    // File Handling
    socket.on('uploadFile', ({ username, filename, description, content }) => {
        const file = {
            id: Date.now().toString(),
            username,
            filename,
            description,
            content,
            timestamp: new Date().toLocaleString()
        };
        files.push(file);
        io.emit('updateFiles', files);
    });

    socket.on('deleteFile', ({ fileId }) => {
        files = files.filter(f => f.id !== fileId);
        io.emit('updateFiles', files);
    });

    // Admin Commands
    socket.on('adminCommand', (command) => {
        if (command.username !== ADMIN.username) return;

        switch(command.action) {
            case 'clearMessages':
                messages = [];
                io.emit('updateMessages', messages);
                break;
            case 'clearUploads':
                files = [];
                io.emit('updateFiles', files);
                break;
            case 'clearAccounts':
                users = [];
                break;
        }
    });

    // Connection cleanup
    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
