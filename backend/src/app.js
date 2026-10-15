const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check (FR-7.4)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CampusConnect-Backend', timestamp: new Date() });
});

// Dhrumil Doshi — Authentication, User Management & Sustainability
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/sustainability', require('./routes/sustainabilityRoutes'));

// Kajal Varlani — Admin Panel & Analytics
app.use('/api/admin', require('./routes/adminRoutes'));

// Charmi Bhayani — Rental & Transaction Management
app.use('/api/rentals', require('./routes/rentalRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));

// Error Middleware
app.use(errorHandler);

module.exports = app;
