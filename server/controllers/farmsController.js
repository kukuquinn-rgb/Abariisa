const Farm = require('../models/Farm');
const User = require('../models/User');
const Livestock = require('../models/Livestock');

// @desc   List farms with member/livestock counts (admin only) — used to filter admin views by farm
// @route  GET /api/farms
const getFarms = async (req, res) => {
  try {
    const farms = await Farm.find({}).populate('owner', 'name email').sort({ createdAt: -1 }).lean();
    const [userCounts, livestockCounts] = await Promise.all([
      User.aggregate([
        { $match: { farm: { $in: farms.map((f) => f._id) } } },
        { $group: { _id: { farm: '$farm', role: '$role' }, count: { $sum: 1 } } }
      ]),
      Livestock.aggregate([
        { $match: { farm: { $in: farms.map((f) => f._id) }, isArchived: false } },
        { $group: { _id: '$farm', count: { $sum: 1 } } }
      ])
    ]);

    const byFarm = {};
    userCounts.forEach(({ _id, count }) => {
      const key = String(_id.farm);
      byFarm[key] = byFarm[key] || { managers: 0, workers: 0, livestock: 0 };
      if (_id.role === 'manager') byFarm[key].managers = count;
      if (_id.role === 'worker') byFarm[key].workers = count;
    });
    livestockCounts.forEach(({ _id, count }) => {
      const key = String(_id);
      byFarm[key] = byFarm[key] || { managers: 0, workers: 0, livestock: 0 };
      byFarm[key].livestock = count;
    });

    res.json(farms.map((farm) => ({ ...farm, counts: byFarm[String(farm._id)] || { managers: 0, workers: 0, livestock: 0 } })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getFarms };
