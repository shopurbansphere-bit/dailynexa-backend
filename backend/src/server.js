require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & parsing
app.use(helmet({
  contentSecurityPolicy: false // allow inline scripts for simple admin page
}));
app.use(express.json({ limit: '10kb' }));
app.use(morgan('combined'));

// CORS - allow everything on free tier for simplicity, tighten later
app.use(cors({
  origin: true,
  credentials: true
}));

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'RATE_LIMITED' }
});
app.use(globalLimiter);

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'DailyNexa Auth API',
    status: 'running',
    timezone: 'Asia/Kolkata',
    time: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes); // also expose /api/server-time and /api/key/status
app.use('/api/admin', adminRoutes);

// Serve Admin Dashboard (static)
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'NOT_FOUND' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'SERVER_ERROR' });
});

// Connect DB and start
async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is missing in environment variables');
      process.exit(1);
    }
    if (!process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
      console.error('ADMIN_PASSWORD and JWT_SECRET must be set');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`DailyNexa API running on port ${PORT}`);
      console.log(`Timezone: Asia/Kolkata`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
