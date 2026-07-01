/**
 * Adds comprehensive demo data across ALL Sprint 1 & 2 features so the system
 * is fully populated for a supervisor demo: livestock, attendance history,
 * a variety of task statuses, and notifications.
 *
 * Run this AFTER addDemoWorkers.js (it relies on those workers existing).
 *
 * Usage:
 *   node addDemoData.js
 *
 * Safe to run on top of existing data — skips anything that already exists,
 * does NOT delete anything.
 * Run it from inside the server/ folder (same place as seed.js).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Livestock = require('./models/Livestock');
const Task = require('./models/Task');
const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');
const TrustScore = require('./models/TrustScore');

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB…\n');

  const manager = await User.findOne({ role: 'manager' });
  if (!manager) {
    console.error('❌ No manager account found. Log in as a manager first, or run addDemoWorkers.js.');
    process.exit(1);
  }

  const workers = await User.find({ role: 'worker' }).populate('trustScore');
  if (workers.length === 0) {
    console.error('❌ No worker accounts found. Run addDemoWorkers.js first.');
    process.exit(1);
  }
  console.log(`Found manager: ${manager.name}`);
  console.log(`Found ${workers.length} worker(s)\n`);

  // ─────────────────────────────────────────────────────────────────────
  // 1. LIVESTOCK
  // ─────────────────────────────────────────────────────────────────────
  console.log('── Adding livestock records ──');

  const livestockData = [
    {
      animalId: 'COW-001', species: 'Cattle', breed: 'Ankole', gender: 'Female',
      healthStatus: 'Healthy', weight: 380, feedingSchedule: '7 AM and 5 PM daily',
      location: 'Paddock A', dateOfBirth: daysAgo(900),
      vaccinationHistory: [
        { vaccine: 'Foot and Mouth Disease Vaccine', date: daysAgo(180), nextDueDate: daysFromNow(180), administeredBy: 'Dr. Wasswa' },
        { vaccine: 'Anthrax Vaccine', date: daysAgo(90), nextDueDate: daysFromNow(275), administeredBy: 'Dr. Wasswa' }
      ]
    },
    {
      animalId: 'COW-002', species: 'Cattle', breed: 'Friesian', gender: 'Female',
      healthStatus: 'Under Treatment', weight: 410, feedingSchedule: '7 AM and 5 PM daily',
      location: 'Paddock A', dateOfBirth: daysAgo(1200), notes: 'Receiving treatment for mastitis since last week',
      vaccinationHistory: [
        { vaccine: 'Foot and Mouth Disease Vaccine', date: daysAgo(180), nextDueDate: daysFromNow(180), administeredBy: 'Dr. Wasswa' }
      ]
    },
    {
      animalId: 'COW-003', species: 'Cattle', breed: 'Ankole', gender: 'Male',
      healthStatus: 'Healthy', weight: 450, feedingSchedule: '7 AM and 5 PM daily',
      location: 'Paddock A', dateOfBirth: daysAgo(1500)
    },
    {
      animalId: 'GOAT-001', species: 'Goat', breed: 'Boer', gender: 'Male',
      healthStatus: 'Healthy', weight: 45, feedingSchedule: '8 AM daily',
      location: 'Paddock B', dateOfBirth: daysAgo(600)
    },
    {
      animalId: 'GOAT-002', species: 'Goat', breed: 'Mubende', gender: 'Female',
      healthStatus: 'Healthy', weight: 38, feedingSchedule: '8 AM daily',
      location: 'Paddock B', dateOfBirth: daysAgo(450)
    },
    {
      animalId: 'GOAT-003', species: 'Goat', breed: 'Boer', gender: 'Female',
      healthStatus: 'Sick', weight: 32, feedingSchedule: '8 AM daily',
      location: 'Paddock B', notes: 'Showing signs of bloat — vet visit scheduled', dateOfBirth: daysAgo(380)
    },
    {
      animalId: 'SHEEP-001', species: 'Sheep', breed: 'Merino', gender: 'Female',
      healthStatus: 'Healthy', weight: 55, feedingSchedule: '8 AM and 4 PM daily',
      location: 'Paddock C', dateOfBirth: daysAgo(700)
    },
    {
      animalId: 'PIG-001', species: 'Pig', breed: 'Landrace', gender: 'Female',
      healthStatus: 'Healthy', weight: 90, feedingSchedule: '6 AM, 12 PM, 6 PM',
      location: 'Piggery 1', dateOfBirth: daysAgo(500)
    },
    {
      animalId: 'PIG-002', species: 'Pig', breed: 'Landrace', gender: 'Male',
      healthStatus: 'Quarantined', weight: 85, feedingSchedule: '6 AM, 12 PM, 6 PM',
      location: 'Quarantine Pen', notes: 'New arrival — 14-day quarantine period before integration', dateOfBirth: daysAgo(400)
    },
    {
      animalId: 'POU-001', species: 'Poultry', breed: 'Kuroiler', gender: 'Female',
      healthStatus: 'Healthy', weight: 2, feedingSchedule: '6 AM, 12 PM, 6 PM',
      location: 'Poultry House 1'
    },
    {
      animalId: 'POU-002', species: 'Poultry', breed: 'Kuroiler', gender: 'Female',
      healthStatus: 'Healthy', weight: 1.8, feedingSchedule: '6 AM, 12 PM, 6 PM',
      location: 'Poultry House 1'
    },
    {
      animalId: 'POU-003', species: 'Poultry', breed: 'Local Breed', gender: 'Male',
      healthStatus: 'Healthy', weight: 2.2, feedingSchedule: '6 AM, 12 PM, 6 PM',
      location: 'Poultry House 1'
    }
  ];

  let livestockCreated = 0;
  for (const data of livestockData) {
    const exists = await Livestock.findOne({ animalId: data.animalId });
    if (exists) { console.log(`  Skipped (exists): ${data.animalId}`); continue; }
    await Livestock.create({ ...data, addedBy: manager._id });
    livestockCreated++;
    console.log(`  ✅ ${data.animalId} — ${data.species} (${data.healthStatus})`);
  }
  console.log(`${livestockCreated} livestock record(s) created.\n`);

  // ─────────────────────────────────────────────────────────────────────
  // 2. ATTENDANCE HISTORY (last 10 working days per worker)
  // ─────────────────────────────────────────────────────────────────────
  console.log('── Adding attendance history ──');

  let attendanceCreated = 0;
  for (const worker of workers) {
    for (let i = 1; i <= 10; i++) {
      const date = daysAgo(i);
      date.setHours(0, 0, 0, 0);

      const exists = await Attendance.findOne({ worker: worker._id, date });
      if (exists) continue;

      const scheduledStart = new Date(date);
      scheduledStart.setHours(7, 0, 0, 0);

      // Lower trust workers get more irregular attendance for a realistic demo
      const trustLevel = worker.trustScore?.overallScore ?? 80;
      const isAbsent = trustLevel < 50 && Math.random() < 0.15;
      const isLate = trustLevel < 75 && Math.random() < 0.35;

      if (isAbsent) {
        await Attendance.create({
          worker: worker._id, date, status: 'Absent', scheduledStart, recordedBy: manager._id
        });
      } else {
        const checkIn = new Date(scheduledStart);
        checkIn.setMinutes(checkIn.getMinutes() + (isLate ? 25 + Math.floor(Math.random() * 40) : Math.floor(Math.random() * 8)));
        const checkOut = new Date(checkIn);
        checkOut.setHours(checkOut.getHours() + 8);

        await Attendance.create({
          worker: worker._id, date, checkIn, checkOut, scheduledStart, recordedBy: worker._id
        });
      }
      attendanceCreated++;
    }
  }
  console.log(`${attendanceCreated} attendance record(s) created across ${workers.length} worker(s).\n`);

  // ─────────────────────────────────────────────────────────────────────
  // 3. TASKS — a mix of statuses to show the full lifecycle
  // ─────────────────────────────────────────────────────────────────────
  console.log('── Adding task history (varied statuses) ──');

  const taskTemplates = [
    { title: 'Morning feeding — Paddock A cattle', category: 'Feeding', priority: 'Medium' },
    { title: 'Clean and disinfect Poultry House 1', category: 'Cleaning', priority: 'Medium' },
    { title: 'Weekly health inspection — goats', category: 'Inspection', priority: 'Medium' },
    { title: 'Repair fencing in Paddock B', category: 'Maintenance', priority: 'Low' },
    { title: 'Administer deworming treatment — sheep', category: 'Medication', priority: 'High' },
    { title: 'Restock feed supplies', category: 'Other', priority: 'Low' },
    { title: 'Evening milking — dairy cattle', category: 'Other', priority: 'Medium' },
    { title: 'Monitor quarantined pig (PIG-002)', category: 'Inspection', priority: 'High' }
  ];

  let tasksCreated = 0;
  let taskIndex = 0;

  for (const worker of workers) {
    // Completed task (on time)
    const t1 = taskTemplates[taskIndex++ % taskTemplates.length];
    const completedExists = await Task.findOne({ assignedTo: worker._id, title: t1.title, status: 'Completed' });
    if (!completedExists) {
      const dueDate = daysAgo(3);
      await Task.create({
        ...t1, assignedTo: worker._id, assignedBy: manager._id,
        dueDate, status: 'Completed', completedAt: daysAgo(3.2)
      });
      tasksCreated++;
    }

    // In Progress task
    const t2 = taskTemplates[taskIndex++ % taskTemplates.length];
    const inProgressExists = await Task.findOne({ assignedTo: worker._id, title: t2.title, status: 'In Progress' });
    if (!inProgressExists) {
      await Task.create({
        ...t2, assignedTo: worker._id, assignedBy: manager._id,
        dueDate: daysFromNow(1), status: 'In Progress'
      });
      tasksCreated++;
    }

    // Pending task (upcoming)
    const t3 = taskTemplates[taskIndex++ % taskTemplates.length];
    const pendingExists = await Task.findOne({ assignedTo: worker._id, title: t3.title, status: 'Pending' });
    if (!pendingExists) {
      await Task.create({
        ...t3, assignedTo: worker._id, assignedBy: manager._id,
        dueDate: daysFromNow(3), status: 'Pending'
      });
      tasksCreated++;
    }

    // Overdue task (for realism — shows the risk/overdue tracking working)
    const trustLevel = worker.trustScore?.overallScore ?? 80;
    if (trustLevel < 70) {
      const t4 = taskTemplates[taskIndex++ % taskTemplates.length];
      const overdueExists = await Task.findOne({ assignedTo: worker._id, title: t4.title, status: 'Overdue' });
      if (!overdueExists) {
        await Task.create({
          ...t4, assignedTo: worker._id, assignedBy: manager._id,
          dueDate: daysAgo(1), status: 'Overdue'
        });
        tasksCreated++;
      }
    }
  }
  console.log(`${tasksCreated} task(s) created across Pending/In Progress/Completed/Overdue statuses.\n`);

  // ─────────────────────────────────────────────────────────────────────
  // 4. NOTIFICATIONS — sample alerts for the manager and workers
  // ─────────────────────────────────────────────────────────────────────
  console.log('── Adding sample notifications ──');

  const lowestTrustWorker = workers.reduce((lowest, w) =>
    (w.trustScore?.overallScore ?? 100) < (lowest.trustScore?.overallScore ?? 100) ? w : lowest
  , workers[0]);

  const notificationData = [
    {
      recipient: manager._id, type: 'risk_alert',
      title: 'High-Risk Task Assignment',
      message: `${lowestTrustWorker.name} has a low Trust Score (${lowestTrustWorker.trustScore?.overallScore ?? 'N/A'}%) and has been assigned high-priority tasks. Consider additional supervision.`,
      relatedWorker: lowestTrustWorker._id
    },
    {
      recipient: manager._id, type: 'livestock_alert',
      title: 'Animal Health Alert',
      message: 'GOAT-003 is showing signs of bloat. A veterinary visit has been scheduled.'
    },
    {
      recipient: manager._id, type: 'attendance_irregularity',
      title: 'Attendance Pattern Alert',
      message: `${lowestTrustWorker.name} has had irregular attendance over the past two weeks.`,
      relatedWorker: lowestTrustWorker._id
    }
  ];

  let notificationsCreated = 0;
  for (const data of notificationData) {
    const exists = await Notification.findOne({ recipient: data.recipient, title: data.title });
    if (exists) continue;
    await Notification.create(data);
    notificationsCreated++;
  }

  // One task-assigned notification per worker (if not already present)
  for (const worker of workers) {
    const exists = await Notification.findOne({ recipient: worker._id, type: 'task_assigned' });
    if (exists) continue;
    await Notification.create({
      recipient: worker._id, type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have new tasks assigned. Check your Tasks page for details.`
    });
    notificationsCreated++;
  }
  console.log(`${notificationsCreated} notification(s) created.\n`);

  // ─────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────
  const totalLivestock = await Livestock.countDocuments({ isArchived: false });
  const totalTasks = await Task.countDocuments({});
  const totalAttendance = await Attendance.countDocuments({});
  const totalNotifications = await Notification.countDocuments({});

  console.log('══════════════════════════════════════════════');
  console.log('✅ Demo data ready for supervisor presentation!');
  console.log('══════════════════════════════════════════════');
  console.log(`  Livestock records:    ${totalLivestock}`);
  console.log(`  Tasks (all statuses): ${totalTasks}`);
  console.log(`  Attendance records:   ${totalAttendance}`);
  console.log(`  Notifications:        ${totalNotifications}`);
  console.log(`  Workers with Trust Scores: ${workers.length}`);
  console.log('══════════════════════════════════════════════\n');

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Failed to add demo data:', err.message);
  process.exit(1);
});