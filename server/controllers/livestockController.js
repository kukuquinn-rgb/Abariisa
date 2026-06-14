const Livestock = require('../models/Livestock');

// @desc   Get all livestock (with filters)
// @route  GET /api/livestock
const getLivestock = async (req, res) => {
  try {
    const { species, healthStatus, search } = req.query;
    const filter = { isArchived: false };

    if (species) filter.species = species;
    if (healthStatus) filter.healthStatus = healthStatus;
    if (search) filter.animalId = { $regex: search, $options: 'i' };

    const livestock = await Livestock.find(filter)
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(livestock);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get single livestock record
// @route  GET /api/livestock/:id
const getLivestockById = async (req, res) => {
  try {
    const animal = await Livestock.findById(req.params.id).populate('addedBy', 'name');
    if (!animal) return res.status(404).json({ message: 'Livestock record not found' });
    res.json(animal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Add livestock
// @route  POST /api/livestock
const addLivestock = async (req, res) => {
  try {
    const animal = await Livestock.create({ ...req.body, addedBy: req.user.id });
    res.status(201).json(animal);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Animal ID already exists' });
    res.status(500).json({ message: err.message });
  }
};

// @desc   Update livestock
// @route  PUT /api/livestock/:id
const updateLivestock = async (req, res) => {
  try {
    const animal = await Livestock.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!animal) return res.status(404).json({ message: 'Livestock record not found' });
    res.json(animal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Archive (soft-delete) livestock
// @route  DELETE /api/livestock/:id
const archiveLivestock = async (req, res) => {
  try {
    const animal = await Livestock.findByIdAndUpdate(
      req.params.id,
      { isArchived: true },
      { new: true }
    );
    if (!animal) return res.status(404).json({ message: 'Livestock record not found' });
    res.json({ message: 'Livestock record archived' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Add vaccination record
// @route  POST /api/livestock/:id/vaccinations
const addVaccination = async (req, res) => {
  try {
    const animal = await Livestock.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Livestock record not found' });
    animal.vaccinationHistory.push(req.body);
    await animal.save();
    res.status(201).json(animal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get livestock stats summary
// @route  GET /api/livestock/stats
const getLivestockStats = async (req, res) => {
  try {
    const total = await Livestock.countDocuments({ isArchived: false });
    const bySpecies = await Livestock.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$species', count: { $sum: 1 } } }
    ]);
    const byHealth = await Livestock.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$healthStatus', count: { $sum: 1 } } }
    ]);
    res.json({ total, bySpecies, byHealth });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getLivestock, getLivestockById, addLivestock, updateLivestock, archiveLivestock, addVaccination, getLivestockStats };
