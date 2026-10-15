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

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Charmi Bhayani — Rental & Transaction Management
app.use('/api/rentals', require('./routes/rentalRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));

// Static serving for React Frontend (Kajal Varlani - FR-6.1 to FR-6.5)
const path = require('path');
const fs = require('fs');
const distPath = path.join(__dirname, '../../Frontend/dist');
if (fs.existsSync(distPath)) {
  app.use('/admin', express.static(distPath));
}

// Error Middleware
app.use(errorHandler);

module.exports = app;
