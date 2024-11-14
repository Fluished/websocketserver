const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});

// Serve a simple HTTP response when the root URL is accessed
app.get('/', (req, res) => {
  res.send('WebSocket Server is Running!'); // This will be shown in the browser
});

// Listen for a new connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);  // Log when a user connects
  
  socket.on('username', (username) => {
    console.log(`${username} connected with id: ${socket.id}`);
  });

  // Listen for messages from clients
  socket.on('chat message', (msg) => {
    console.log('Message received:', msg);
    io.emit('chat message', msg); // Send the message to all clients
  });

  // Log when a user disconnects
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
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
