const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database (or create it if it doesn't exist)
const dbPath = path.resolve(__dirname, 'creatorsync.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database ' + err.message);
    } else {
        console.log('✅ Connected to the SQLite database.');
    }
});

// Create tables if they don't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT, 
        twitch_id TEXT
    )`);
});

module.exports = db;