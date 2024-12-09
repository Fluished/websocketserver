const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose(); // Import SQLite

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});

const db = new sqlite3.Database('users.db');

// Serve a simple HTTP response when the root URL is accessed
app.get('/', (req, res) => {
  res.send('WebSocket Server is Running!'); // This will be shown in the browser
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);  // Log when a user connects

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });

  socket.on('get_users', () => {
    db.all('SELECT * FROM users', [], (err, rows) => {
      if (err) {
        console.error('Error fetching users:', err.message);
        return;
      }
      socket.emit('users_data', rows);  // Send the user data to the frontend
    });
  });

  socket.on('add_user', (newUserData) => {
    const {email, password, img} = newUserData;

    db.run(
      'INSERT INTO users (email, password, img) VALUES (?, ?, ?)',
      [email, password, img || null],
      (err) => {
        if(err) {
          console.error('Error adding user:', err.message);
          socket.emit('user_added', { success: false, message: 'Error adding user'});
        } else {
          console.log('User added succesfully');
          db.all('SELECT * FROM users', [], (err, rows) => {
            if (!err) {
              io.emit('users_data', rows);
            }
          });
          socket.emit('user_added', { success: true, message: 'User added successfully'});
        }
      }
    );
  });

  socket.on('edit_user', (editUserData) => {
    const {email, password, img, oldEmail} = editUserData;

    db.get('SELECT id FROM users WHERE email = ?', [oldEmail], (err,row) => {
      if (err) {
        console.error('Error retrieving user:', err.message);
        socket.emit('user_edited', { success: false, message: 'Error retrieving user' });
        return;
      }

      if (row) {
        const userId = row.id;

        db.run( 
          'UPDATE users SET email = ?, password = ?, img = ? WHERE id = ?',
          [email, password, img || null, userId],
          (err) => {
            if(err) {
              console.error('Error editing user:', err.message);
              socket.emit('user_edited', { success: false, message: 'Error editing user'});
            } else {
              console.log('User edited succesfully');
              db.all('SELECT * FROM users', [], (err, rows) => {
                if (!err) {
                  io.emit('users_data', rows); // Notify all connected clients
                }
              });
              socket.emit('user_edited', { success: true, message: 'User edited successfully'});
            }
          }
        );
      } else {
        console.log('User not found with this email');
        socket.emit('user_edited', { success: false, message: 'User not found' });
      }
    });
  });

  socket.on('login_request', (data) => {
    const { email, password, img} = data;

    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        socket.emit('login_response', { success: false, message: 'An error occurred' });
      } else if (row) {
        // User found, login successful
        socket.emit('login_response', { success: true, message: `${data.email} Successfully Logged In!`});
      } else {
        // User not found or invalid credentials
        socket.emit('login_response', { success: false, message: 'Login unsuccessful!'});
      }
    });
  });

});

server.listen(3000, () => {
  console.log('WebSocket server running on http://localhost:3000');
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
      console.log('Server closed');
      process.exit(0);
  });
});