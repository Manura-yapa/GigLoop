const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const dns = require('dns');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

dotenv.config({
  path: path.join(__dirname, '.env'),
});

const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const { router: chatRouter, attachChat } = require('./chat');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 100000,
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/gigs', require('./routes/gigs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', chatRouter);

attachChat(io);

async function start() {
  try {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
      throw new Error('Missing backend configuration.');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
      serverSelectionTimeoutMS: 10000,
    });

    // Ensure duplicate protection exists before accepting chat requests.
    await Promise.all([
      Conversation.init(),
      Message.init(),
    ]);

    console.log('MongoDB connection established successfully');

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Backend startup failed (${error.name}).`);
    console.error('Check backend configuration, database access, and indexes.');
    await mongoose.disconnect();
    process.exitCode = 1;
  }
}

start();