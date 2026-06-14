/**
 * Seed script — populates the database with sample users, livestock, and tasks.
 * Run with: node seed.js
 * WARNING: This will clear existing data in the relevant collections.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Livestock = require('./models/Livestock');
const Task = require('./models/Task');
const TrustScore = require('./models/TrustScore');
const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for seeding…');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Livestock.deleteMany({}),
    Task.deleteMany({}),
    TrustScore.deleteMany({}),
    Attendance.deleteMany({}),
    Notification.deleteMany({})
  ]);

  // Create manager
  // Create system administrator
  const admin = await User.create({
    name: 'System Administrator',
    email: 'admin@abariisa.com',
    password: 'password123',
    role: 'admin',
    phone: '+256700000000'
  });

  const manager = await User.create({
    name: 'Linda Kukunda',
    email: 'manager@abariisa.com',
    password: 'password123',
    role: 'manager',
    phone: '+256700000001'
  });

  // Create workers
  const worker1 = await User.create({
    name: 'James Okello',
    email: 'james@abariisa.com',
    password: 'password123',
    role: 'worker',
    phone: '+256700000002',
    position: 'Livestock Keeper',
    department: 'Dairy Section',
    employmentStartDate: new Date('2025-01-15')
  });

  const worker2 = await User.create({
    name: 'Grace Nambi',
    email: 'grace@abariisa.com',
    password: 'password123',
    role: 'worker',
    phone: '+256700000003',
    position: 'Farm Attendant',
    department: 'Poultry Section',
    employmentStartDate: new Date('2025-03-01')
  });

  // Create trust scores
  const ts1 = await TrustScore.create({
    worker: worker1._id,
    attendanceScore: 92, punctualityScore: 88, taskCompletionScore: 95,
    responsivenessScore: 90, consistencyScore: 87,
    history: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
      score: 85 + i
    }))
  });
  ts1.recalculate();
  await ts1.save();
  worker1.trustScore = ts1._id;
  await worker1.save();

  const ts2 = await TrustScore.create({
    worker: worker2._id,
    attendanceScore: 65, punctualityScore: 60, taskCompletionScore: 58,
    responsivenessScore: 70, consistencyScore: 62,
    history: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
      score: 70 - i
    }))
  });
  ts2.recalculate();
  await ts2.save();
  worker2.trustScore = ts2._id;
  await worker2.save();

  // Create livestock
  await Livestock.create([
    {
      animalId: 'COW-001', species: 'Cattle', breed: 'Ankole', gender: 'Female',
      healthStatus: 'Healthy', weight: 380, feedingSchedule: '7 AM and 5 PM daily',
      location: 'Paddock A', addedBy: manager._id,
      vaccinationHistory: [{ vaccine: 'FMD Vaccine', date: new Date('2026-01-10'), nextDueDate: new Date('2026-07-10'), administeredBy: 'Dr. Wasswa' }]
    },
    {
      animalId: 'COW-002', species: 'Cattle', breed: 'Friesian', gender: 'Female',
      healthStatus: 'Under Treatment', weight: 410, feedingSchedule: '7 AM and 5 PM daily',
      location: 'Paddock A', addedBy: manager._id, notes: 'Receiving treatment for mastitis'
    },
    {
      animalId: 'GOAT-001', species: 'Goat', breed: 'Boer', gender: 'Male',
      healthStatus: 'Healthy', weight: 45, feedingSchedule: '8 AM daily',
      location: 'Paddock B', addedBy: manager._id
    },
    {
      animalId: 'POU-001', species: 'Poultry', breed: 'Kuroiler', gender: 'Female',
      healthStatus: 'Healthy', weight: 2, feedingSchedule: '6 AM, 12 PM, 6 PM',
      location: 'Poultry House 1', addedBy: manager._id
    }
  ]);

  // Create tasks
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await Task.create([
    {
      title: 'Morning feeding — Cattle paddock A', description: 'Feed all cattle in paddock A according to schedule',
      priority: 'Medium', status: 'Completed', assignedTo: worker1._id, assignedBy: manager._id,
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
      category: 'Feeding'
    },
    {
      title: 'Administer medication to COW-002', description: 'Give prescribed antibiotics as per vet instructions',
      priority: 'High', status: 'Pending', assignedTo: worker1._id, assignedBy: manager._id,
      dueDate: tomorrow, category: 'Medication'
    },
    {
      title: 'Clean poultry house 1', description: 'Full cleaning and disinfection of poultry house',
      priority: 'Medium', status: 'In Progress', assignedTo: worker2._id, assignedBy: manager._id,
      dueDate: tomorrow, category: 'Cleaning', riskFlag: 'Medium'
    },
    {
      title: 'Weekly health inspection — all livestock', description: 'Conduct routine health checks on all animals',
      priority: 'High', status: 'Pending', assignedTo: worker2._id, assignedBy: manager._id,
      dueDate: nextWeek, category: 'Inspection', riskFlag: 'High'
    }
  ]);

  console.log('✅ Seed data created successfully!');
  console.log('\nLogin credentials:');
  console.log('  Manager:  manager@abariisa.com / password123');
  console.log('  Worker 1: james@abariisa.com / password123');
  console.log('  Worker 2: grace@abariisa.com / password123');
  console.log('  Admin:    admin@abariisa.com / password123');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
