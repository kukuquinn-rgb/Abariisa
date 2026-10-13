/**
 * Shared by the demo scripts (addDemoWorkers / addDemoData / seedDemoday):
 * picks which farm demo data is written to.
 *
 *   --farm=<farm id or exact farm name>   use that farm (and its owner as manager)
 *   (no flag)                             the oldest manager's farm
 */
const mongoose = require('mongoose');
const User = require('./models/User');
const Farm = require('./models/Farm');

const farmArg = () => {
  const arg = process.argv.find((a) => a.startsWith('--farm='));
  return arg ? arg.slice('--farm='.length) : null;
};

// Returns { farm, manager }, or null when there is no manager/farm yet.
const resolveDemoFarm = async () => {
  const wanted = farmArg();
  if (wanted) {
    const farm = mongoose.isValidObjectId(wanted)
      ? await Farm.findById(wanted)
      : await Farm.findOne({ name: wanted });
    if (!farm) throw new Error(`Farm not found: ${wanted}`);
    const manager = (await User.findById(farm.owner)) || (await User.findOne({ farm: farm._id, role: 'manager' }));
    if (!manager) throw new Error(`Farm "${farm.name}" has no manager`);
    return { farm, manager };
  }

  const manager = await User.findOne({ role: 'manager', farm: { $ne: null } }).sort({ createdAt: 1 });
  if (!manager) return null;
  const farm = await Farm.findById(manager.farm);
  if (!farm) throw new Error(`Manager ${manager.email} points to a missing farm — run migrations/001-add-farm.js`);
  return { farm, manager };
};

// Creates a farm and its manager in one go (ids are pre-assigned because each requires the other).
const createFarmWithManager = async ({ farmName, district, manager }) => {
  const farmId = new mongoose.Types.ObjectId();
  const user = await User.create({ ...manager, role: 'manager', farm: farmId });
  const farm = await Farm.create({ _id: farmId, name: farmName, district, owner: user._id });
  return { farm, manager: user };
};

module.exports = { resolveDemoFarm, createFarmWithManager };
