require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const name = process.argv[2] || 'System Administrator';
const email = process.argv[3] || 'admin@abariisa.com';
const password = process.argv[4] || 'password123';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let user = await User.findOne({ email });
  if (user) {
    user.role = 'admin';
    user.isActive = true;
    if (process.argv[4]) user.password = password;
    await user.save();
    console.log('Updated existing user to admin:', email);
  } else {
    user = await User.create({ name, email, password, role: 'admin' });
    console.log('Created admin user:', email);
  }

  console.log('Credentials:');
  console.log(`  ${email} / ${process.argv[4] || password}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Failed to create admin:', err.message);
  process.exit(1);
});
