const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins (replace with your frontend URL in production)
        methods: ['GET', 'POST'],
    },
});

// Connect to MongoDB
mongoose.connect('mongodb+srv://unexpectedtouche382:<db_password>@cluster0.bjvub.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
});

// Define Mongoose Schemas and Models
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const messageSchema = new mongoose.Schema({
    username: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const fileSchema = new mongoose.Schema({
    username: { type: String, required: true },
    filename: { type: String, required: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);
const File = mongoose.model('File', fileSchema);

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send existing messages and files to the new user
    Message.find().then((messages) => {
        socket.emit('messages', messages);
    });

    File.find().then((files) => {
        socket.emit('files', files);
    });

    // Listen for new messages
    socket.on('sendMessage', async (message) => {
        const newMessage = new Message({
            username: message.username,
            content: message.content,
        });
        await newMessage.save();
        io.emit('newMessage', newMessage); // Broadcast the message to all users
    });

    // Listen for message edits
    socket.on('editMessage', async (data) => {
        const { id, content, username } = data;
        const message = await Message.findById(id);

        if (message && (username === 'admin' || message.username === username)) {
            message.content = content;
            await message.save();
            io.emit('updateMessage', message); // Broadcast the updated message
        } else {
            console.log('Unauthorized edit attempt');
        }
    });

    // Listen for message deletions
    socket.on('deleteMessage', async (data) => {
        const { id, username } = data;
        const message = await Message.findById(id);

        if (message && (username === 'admin' || message.username === username)) {
            await Message.deleteOne({ _id: id });
            io.emit('removeMessage', id); // Broadcast the deleted message ID
        } else {
            console.log('Unauthorized delete attempt');
        }
    });

    // Listen for file uploads
    socket.on('uploadFile', async (file) => {
        const newFile = new File({
            username: file.username,
            filename: file.filename,
            description: file.description,
            content: file.content,
        });
        await newFile.save();
        io.emit('newFile', newFile); // Broadcast the new file to all users
    });

    // Listen for file deletions
    socket.on('deleteFile', async (fileId) => {
        const file = await File.findById(fileId);

        if (file && (file.username === socket.username || socket.username === 'admin')) {
            await File.deleteOne({ _id: fileId });
            io.emit('removeFile', fileId); // Broadcast the deleted file ID
        } else {
            console.log('Unauthorized delete attempt');
        }
    });

    // Listen for admin actions
    socket.on('clearAllMessages', async () => {
        await Message.deleteMany({});
        io.emit('clearAllMessages'); // Broadcast to clear all messages
    });

    socket.on('clearAllUploads', async () => {
        await File.deleteMany({});
        io.emit('clearAllUploads'); // Broadcast to clear all uploads
    });

    socket.on('clearAllAccounts', async () => {
        await User.deleteMany({});
        io.emit('clearAllAccounts'); // Broadcast to clear all accounts
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
