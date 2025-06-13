const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to the database
connectDB();

const app = express();

// This allows your server to accept JSON data in requests
app.use(express.json());

// --- Define Your API Routes ---
// Anything that starts with /api/auth will be handled by authRoutes
app.use('/api/auth', require('./routes/AuthRoutes'));
app.use('/api/users', require('./routes/UserRoutes'));
app.use('/api/auth', require('./routes/bookingRoutes'));
// Add other routes for bookings, etc.

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));