const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins (replace with your frontend URL in production)
        methods: ['GET', 'POST'],
    },
});

// In-memory storage for users, messages, and files (replace with a database in production)
let users = [];
let messages = [];
let files = [];

// Secret key for JWT
const JWT_SECRET = 'your_jwt_secret_key';

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to authenticate JWT
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Register a new user
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (users.find((user) => user.username === username)) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, password: hashedPassword };
    users.push(newUser);
    res.status(201).json({ message: 'User registered successfully' });
});

// Login a user
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find((user) => user.username === username);
    if (!user) return res.status(400).json({ message: 'Invalid username or password' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Invalid username or password' });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

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
        if (index !== -1 && messages[index].username === editedMessage.username) {
            messages[index].content = editedMessage.content;
            io.emit('updateMessage', messages[index]); // Broadcast the updated message
        }
    });

    // Listen for message deletions
    socket.on('deleteMessage', (messageId, username) => {
        const index = messages.findIndex((msg) => msg.id === messageId && msg.username === username);
        if (index !== -1) {
            messages.splice(index, 1);
            io.emit('removeMessage', messageId); // Broadcast the deleted message ID
        }
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
    socket.on('deleteFile', (fileId, username) => {
        const file = files.find((f) => f.id === fileId && f.username === username);
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
