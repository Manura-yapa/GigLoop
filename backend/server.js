const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const dns = require("dns");
const http = require('http'); // 1. Import http
const { Server } = require('socket.io'); // 2. Import Socket.io

dotenv.config();

// DNS fix
const dnsServers = ["8.8.8.8", "1.1.1.1"];
dns.setServers(dnsServers);

const app = express();

// 3. Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"], // Allow both Vite ports just in case
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gigs', require('./routes/gigs'));

// 4. Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user clicks on a gig to chat about it, they join a "room" specific to that gig
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // When a user sends a message, broadcast it only to others in that specific room
  socket.on('send_message', (data) => {
    socket.to(data.room).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connection established successfully'))
  .catch((err) => console.log('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;

// 5. Change app.listen to server.listen so WebSockets work
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});