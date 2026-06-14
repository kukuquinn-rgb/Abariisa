const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email']
    },
    password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
    role: {
      type: String,
      enum: ['manager', 'worker', 'admin'],
      default: 'worker'
    },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    // Worker-specific fields
    position: { type: String, trim: true },
    department: { type: String, trim: true },
    employmentStartDate: { type: Date },
    // Trust Score reference (populated for workers)
    trustScore: { type: mongoose.Schema.Types.ObjectId, ref: 'TrustScore' }
    ,
    // View-only collaborator flag and inviter
    viewOnly: { type: Boolean, default: false },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
