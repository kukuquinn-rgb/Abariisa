const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const livestockRoutes = require('./routes/livestock');
const taskRoutes = require('./routes/tasks');
const attendanceRoutes = require('./routes/attendance');
const notificationRoutes = require('./routes/notifications');
const inviteRoutes = require('./routes/invites');
const trustScoreRoutes = require('./routes/trustScores');
const leaveRoutes = require('./routes/leave');
const workPlanRoutes = require('./routes/workPlans');

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost:')) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (origin.endsWith('.netlify.app')) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));

app.use(express.json());
app.use(morgan('dev'));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/livestock', livestockRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/trust-scores', trustScoreRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/work-plans', workPlanRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });