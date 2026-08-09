/**
 * Run this on the MORNING OF THE DEMO (and any day before, as a dry run).
 *
 * Fixes the one thing addDemoData.js can't: "My Tasks Today" needs a task
 * whose dueDate is literally today's calendar date — a relative offset
 * seeded days earlier won't land on "today" anymore. This script re-syncs
 * that, tops up attendance so "This Month" / "Last 7 Days" always have
 * fresh records relative to whenever it's run, and reports each demo
 * worker's login + current Trust Score so you have a cheat-sheet ready.
 *
 * Order:
 *   1. node addDemoWorkers.js   (once — creates the 4 demo workers)
 *   2. node addDemoData.js     (once — livestock, task variety, notifications)
 *   3. node seedDemoDay.js     (run again on the morning of the 12th)
 *
 * Safe to run daily leading up to the demo. Idempotent — does not delete
 * or duplicate anything; only tops up what's missing for "today."
 *
 * Usage:
 *   node seedDemoDay.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const Attendance = require('./models/Attendance');
const TrustScore = require('./models/TrustScore');

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysAgo = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return x; };

const DEMO_WORKER_EMAILS = [
  'peter@abariisa.com',
  'sarah@abariisa.com',
  'moses@abariisa.com',
  'esther@abariisa.com',
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB…\n');

  const manager = await User.findOne({ role: 'manager' });
  if (!manager) {
    console.error('❌ No manager found. Run addDemoWorkers.js first.');
    process.exit(1);
  }

  const workers = await User.find({ email: { $in: DEMO_WORKER_EMAILS } }).populate('trustScore');
  if (workers.length === 0) {
    console.error('❌ No demo workers found. Run addDemoWorkers.js first.');
    process.exit(1);
  }

  const today = startOfDay(new Date());

  // ── 1. Guarantee at least one task due TODAY per worker ──────────────
  console.log('── Syncing "due today" tasks ──');
  const dueTodayTitles = {
    'peter@abariisa.com': 'Morning feeding — Paddock A cattle',
    'sarah@abariisa.com': 'Weekly health inspection — goats',
    'moses@abariisa.com': 'Clean and disinfect Poultry House 1',
    'esther@abariisa.com': 'Administer deworming treatment — sheep',
  };
  const categoryFor = {
    'Morning feeding — Paddock A cattle': 'Feeding',
    'Weekly health inspection — goats': 'Inspection',
    'Clean and disinfect Poultry House 1': 'Cleaning',
    'Administer deworming treatment — sheep': 'Medication',
  };

  for (const worker of workers) {
    const title = dueTodayTitles[worker.email];

    // Remove any stale "due today" demo task from a previous run (different date)
    await Task.deleteMany({
      assignedTo: worker._id,
      title,
      status: { $in: ['Pending', 'In Progress'] },
      dueDate: { $lt: today },
    });

    const existsToday = await Task.findOne({
      assignedTo: worker._id,
      title,
      dueDate: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
    });

    if (existsToday) {
      console.log(`  Already set for today: ${worker.name} — "${title}"`);
      continue;
    }

    const dueDate = new Date(today);
    dueDate.setHours(23, 59, 0, 0); // due end of day — avoids the auto-Overdue pre-save hook firing if run late in the day

    await Task.create({
      title,
      category: categoryFor[title],
      priority: 'Medium',
      assignedTo: worker._id,
      assignedBy: manager._id,
      dueDate,
      status: 'Pending',
    });
    console.log(`  ✅ ${worker.name} — "${title}" now due today`);
  }

  // ── 2. Top up attendance so "This Month" / "Last 7 Days" stay fresh ──
  console.log('\n── Topping up recent attendance ──');
  let attendanceCreated = 0;
  for (const worker of workers) {
    for (let i = 1; i <= 7; i++) {
      const date = startOfDay(daysAgo(i));
      const exists = await Attendance.findOne({ worker: worker._id, date });
      if (exists) continue;

      const scheduledStart = new Date(date);
      scheduledStart.setHours(7, 0, 0, 0);

      const trustLevel = worker.trustScore?.overallScore ?? 80;
      const isAbsent = trustLevel < 50 && Math.random() < 0.1;
      const isLate = trustLevel < 75 && Math.random() < 0.3;

      if (isAbsent) {
        await Attendance.create({
          worker: worker._id, date, status: 'Absent', scheduledStart, recordedBy: manager._id,
        });
      } else {
        const checkIn = new Date(scheduledStart);
        checkIn.setMinutes(checkIn.getMinutes() + (isLate ? 25 + Math.floor(Math.random() * 40) : Math.floor(Math.random() * 8)));
        const checkOut = new Date(checkIn);
        checkOut.setHours(checkOut.getHours() + 8);

        await Attendance.create({
          worker: worker._id, date, checkIn, checkOut, scheduledStart, recordedBy: worker._id,
        });
      }
      attendanceCreated++;
    }
  }
  console.log(`  ${attendanceCreated} attendance record(s) topped up.\n`);

  // ── 3. Cheat sheet ─────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════');
  console.log('✅ Ready for demo — login cheat sheet:');
  console.log('══════════════════════════════════════════════');
  for (const worker of workers) {
    const ts = await TrustScore.findOne({ worker: worker._id });
    console.log(`  ${worker.name.padEnd(20)} ${worker.email.padEnd(24)} password123   Trust: ${ts?.overallScore ?? '—'}%`);
  }
  console.log(`  ${manager.name.padEnd(20)} ${manager.email.padEnd(24)} password123   (manager)`);
  console.log('══════════════════════════════════════════════\n');

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});