const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const dns = require("dns");
const http = require('http'); // 1. Import http
const { Server } = require('socket.io'); // 2. Import Socket.io
const Message = require('./models/Message'); // Import the Message model

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
app.use('/api/applications', require('./routes/applications'));
app.use('/api/reviews', require('./routes/reviews'));


    app.get('/api/messages/:roomId', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.roomId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

// 4. Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      // Save message to MongoDB
      const newMsg = new Message(data);
      await newMsg.save();
      
      // Broadcast to everyone else in the room
      socket.to(data.room).emit('receive_message', data);
    } catch (err) {
      console.error('Error saving message:', err);
    }
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