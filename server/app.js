const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

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
const aiRoutes = require('./routes/ai');
const farmRoutes = require('./routes/farms');

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
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

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
app.use('/api/ai', aiRoutes);
app.use('/api/farms', farmRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
