// database.js
const Database = require('better-sqlite3');

// Connect to the SQLite database (or create it if it doesn't exist)
const db = new Database('forum.db');

// Initialize the database (create tables if they don't exist)
function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );
    `);
}

// Add a new user
function addUser(username, password) {
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    stmt.run(username, password);
}

// Check if a user exists
function userExists(username) {
    const stmt = db.prepare('SELECT username FROM users WHERE username = ?');
    return stmt.get(username) !== undefined;
}

// Validate user credentials
function validateUser(username, password) {
    const stmt = db.prepare('SELECT username FROM users WHERE username = ? AND password = ?');
    return stmt.get(username, password) !== undefined;
}

// Add a new message
function addMessage(id, username, content, timestamp) {
    const stmt = db.prepare('INSERT INTO messages (id, username, content, timestamp) VALUES (?, ?, ?, ?)');
    stmt.run(id, username, content, timestamp);
}

// Get all messages
function getMessages() {
    const stmt = db.prepare('SELECT * FROM messages');
    return stmt.all();
}

// Edit a message
function editMessage(id, content, username) {
    const stmt = db.prepare('UPDATE messages SET content = ? WHERE id = ? AND username = ?');
    const result = stmt.run(content, id, username);
    return result.changes > 0; // Returns true if the message was updated
}

// Delete a message
function deleteMessage(id, username) {
    const stmt = db.prepare('DELETE FROM messages WHERE id = ? AND username = ?');
    const result = stmt.run(id, username);
    return result.changes > 0; // Returns true if the message was deleted
}

module.exports = {
    initializeDatabase,
    addUser,
    userExists,
    validateUser,
    addMessage,
    getMessages,
    editMessage,
    deleteMessage,
};