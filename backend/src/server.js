require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const { startRentalScheduler } = require('./services/rentalReminderService');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Attach io instance to express app for controller access
app.set('io', io);

// Initialize authenticated Socket.io service for Chat & Notifications
const { initSocketServer } = require('./services/socketService');
initSocketServer(io);

// Charmi Bhayani — Start rental reminder scheduler
startRentalScheduler(io);

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
