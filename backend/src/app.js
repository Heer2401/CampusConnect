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
app.use('/api/v1/categories', require('./routes/categoryRoutes'));
app.use('/api/v1/listings', require('./routes/listingRoutes'));

// Error Middleware
app.use(errorHandler);

module.exports = app;
