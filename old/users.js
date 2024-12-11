const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path to the database
const dbPath = path.resolve(__dirname, 'users.db');

// Create a new SQLite database or open an existing one
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create a users table (if it doesn't already exist)
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    img TEXT
  )
`, (err) => {
  if (err) {
    console.error('Error creating table:', err.message);
  } else {
    console.log('Users table created or already exists');
  }
});

module.exports = db;