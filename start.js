const express = require('express');
const path = require('path');
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

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary configuration
cloudinary.config({
  cloud_name: 'ds1mg3eoc', // Replace with your Cloudinary Cloud Name
  api_key: '477817764153357', // Replace with your Cloudinary API Key
  api_secret: 'PCTCzxutwU1dd_Yib1M2iN-xod0', // Replace with your Cloudinary API Secret
});

// Configure multer storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user_images', // Name of the folder in Cloudinary
    format: async (req, file) => 'jpeg', // Image format (e.g., jpeg, png)
    public_id: (req, file) => `user_${Date.now()}`, // Unique public ID for the image
  },
});

const upload = multer({ storage });

// Express route for image upload
app.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  // Respond with the Cloudinary URL
  res.status(200).json({
    success: true,
    url: req.file.path, // The URL of the uploaded image on Cloudinary
  });
});

app.use(express.static(path.join(__dirname, 'templates')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

let connectedUsers = [];

const db = new sqlite3.Database('users.db');

// root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'base.html'));
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // log dced user
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    connectedUsers = connectedUsers.filter(user => user.socketId !== socket.id);

    io.emit('userListUpdate', connectedUsers);
  });

  // list users
  socket.on('get_users', () => {
    db.all('SELECT * FROM users', [], (err, rows) => {
      if (err) {
        console.error('Error fetching users:', err.message);
        return;
      }
      socket.emit('users_data', rows);  // Send the user data to the frontend
    });
  });

  // add user from frontend
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

  // edit user from frontend
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
          // If no image is provided, just update email and password
          db.run(
            'UPDATE users SET email = ?, password = ?, img = ? WHERE id = ?',
            [email, password, null, userId],
            (err) => {
              if (err) {
                console.error('Error editing user:', err.message);
                socket.emit('user_edited', { success: false, message: 'Error editing user' });
              } else {
                console.log('User edited successfully without new image');
                db.all('SELECT * FROM users', [], (err, rows) => {
                  if (!err) {
                    io.emit('users_data', rows); // Notify all connected clients
                  }
                });
                socket.emit('user_edited', { success: true, message: 'User edited successfully' });
              }
            }
          );
        
      } else {
        console.log('User not found with this email');
        socket.emit('user_edited', { success: false, message: 'User not found' });
      }
    });
  });

  // login authentication
  socket.on('login_request', (data) => {
    const { email, password, img} = data;

    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        socket.emit('login_response', { success: false, message: 'An error occurred' });
      } else if (row) {
        // User found, login successful
        const loggedInUser = {
          socketId: socket.id,
          email: email,
          loginTime: new Date().toISOString(),
        };
        connectedUsers.push(loggedInUser);
        io.emit('userListUpdate', connectedUsers);

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

// log signout
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
      console.log('Server closed');
      process.exit(0);
  });
});
