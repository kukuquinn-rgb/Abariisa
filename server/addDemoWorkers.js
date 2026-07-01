/**
 * Adds extra demo workers with varied Trust Scores and a few high-priority
 * tasks, so you can demonstrate the Worker Trust Score and Task Risk
 * Prediction features without re-running the full seed (which wipes data).
 *
 * Usage:
 *   node addDemoWorkers.js
 *
 * Safe to run on top of existing data — does NOT delete anything.
 * Run it from inside the server/ folder (same place as seed.js).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const TrustScore = require('./models/TrustScore');
const Task = require('./models/Task');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB…');

  // Find an existing manager to assign tasks from (falls back to creating one)
  let manager = await User.findOne({ role: 'manager' });
  if (!manager) {
    manager = await User.create({
      name: 'Linda Kukunda',
      email: 'manager@abariisa.com',
      password: 'password123',
      role: 'manager'
    });
    console.log('No manager found — created one: manager@abariisa.com / password123');
  }

  // Worker profiles spanning the full trust spectrum
  const workerProfiles = [
    {
      name: 'Peter Tumusiime', email: 'peter@abariisa.com', position: 'Livestock Keeper', department: 'Cattle Section',
      attendanceScore: 95, punctualityScore: 92, taskCompletionScore: 97, responsivenessScore: 90, consistencyScore: 93
    },
    {
      name: 'Sarah Atuhaire', email: 'sarah@abariisa.com', position: 'Farm Attendant', department: 'Dairy Section',
      attendanceScore: 78, punctualityScore: 74, taskCompletionScore: 80, responsivenessScore: 76, consistencyScore: 72
    },
    {
      name: 'Moses Byaruhanga', email: 'moses@abariisa.com', position: 'Poultry Handler', department: 'Poultry Section',
      attendanceScore: 55, punctualityScore: 48, taskCompletionScore: 52, responsivenessScore: 60, consistencyScore: 50
    },
    {
      name: 'Esther Kyomuhendo', email: 'esther@abariisa.com', position: 'Farm Attendant', department: 'Goat Section',
      attendanceScore: 38, punctualityScore: 35, taskCompletionScore: 40, responsivenessScore: 45, consistencyScore: 32
    }
  ];

  const createdWorkers = [];

  for (const profile of workerProfiles) {
    const existing = await User.findOne({ email: profile.email });
    if (existing) {
      console.log(`Skipped (already exists): ${profile.email}`);
      createdWorkers.push(existing);
      continue;
    }

    const worker = await User.create({
      name: profile.name,
      email: profile.email,
      password: 'password123',
      role: 'worker',
      position: profile.position,
      department: profile.department,
      employmentStartDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    });

    const trustScore = await TrustScore.create({
      worker: worker._id,
      attendanceScore: profile.attendanceScore,
      punctualityScore: profile.punctualityScore,
      taskCompletionScore: profile.taskCompletionScore,
      responsivenessScore: profile.responsivenessScore,
      consistencyScore: profile.consistencyScore,
      // 14-day trend history so the chart on the worker profile page has data
      history: Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000),
        score: Math.max(0, Math.min(100,
          Math.round((profile.attendanceScore + profile.taskCompletionScore) / 2) + (Math.random() * 10 - 5)
        ))
      }))
    });
    trustScore.recalculate();
    await trustScore.save();

    worker.trustScore = trustScore._id;
    await worker.save();

    createdWorkers.push(worker);
    console.log(`✅ Created ${worker.name} — Trust Score: ${trustScore.overallScore}%`);
  }

  // Create a few high-priority tasks for the lower-trust workers,
  // which should auto-trigger riskFlag via the existing task creation logic
  const lowTrustWorkers = createdWorkers.slice(2); // Moses and Esther
  const taskTitles = [
    'Administer vaccine to entire poultry flock',
    'Emergency response — sick goat in paddock B',
    'Critical equipment inspection before evening feeding'
  ];

  for (let i = 0; i < lowTrustWorkers.length; i++) {
    const worker = lowTrustWorkers[i];
    const alreadyHasDemoTask = await Task.findOne({
      assignedTo: worker._id,
      title: { $in: taskTitles }
    });
    if (alreadyHasDemoTask) {
      console.log(`Skipped demo task for ${worker.name} (already exists)`);
      continue;
    }

    const ts = await TrustScore.findOne({ worker: worker._id });
    let riskFlag = null;
    if (ts.overallScore < 50) riskFlag = 'High';
    else if (ts.overallScore < 70) riskFlag = 'Medium';

    const task = await Task.create({
      title: taskTitles[i % taskTitles.length],
      description: 'Demo task created to illustrate Task Risk Prediction based on Worker Trust Score.',
      priority: 'High',
      status: 'Pending',
      assignedTo: worker._id,
      assignedBy: manager._id,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      category: 'Inspection',
      riskFlag
    });

    console.log(`✅ Created high-priority task for ${worker.name} — Risk Flag: ${riskFlag || 'none'}`);
  }

  console.log('\n──────────────────────────────────────────────');
  console.log('Demo workers ready! Trust Score summary:');
  for (const worker of createdWorkers) {
    const ts = await TrustScore.findOne({ worker: worker._id });
    console.log(`  ${worker.name.padEnd(22)} ${ts.overallScore}%  (login: ${worker.email} / password123)`);
  }
  console.log('──────────────────────────────────────────────\n');

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Failed to add demo workers:', err.message);
  process.exit(1);
});