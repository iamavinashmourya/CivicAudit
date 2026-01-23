const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Handle preflight requests explicitly
// NOTE: Express 5 (path-to-regexp) does not accept '*' as a route pattern.
app.options(/.*/, cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civicaudit')
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'CivicAudit Backend API is running' });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
// app.use('/api/reports', require('./routes/reports'));
// app.use('/api/admin', require('./routes/admin'));

// Default to 5002 to avoid common conflicts (5000 is often used by other dev servers on Windows)
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
