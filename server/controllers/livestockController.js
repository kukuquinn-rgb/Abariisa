const Livestock = require('../models/Livestock');
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const User = require('../models/User');

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
    const animal = await Livestock.findById(req.params.id).populate('addedBy');
    if (!animal) return res.status(404).json({ message: 'Livestock record not found' });

    const previousHealthStatus = animal.healthStatus;
    Object.assign(animal, req.body);
    await animal.save();

    const alertStatuses = ['Sick', 'Quarantined', 'Under Treatment'];
    const isHealthAlert = previousHealthStatus !== animal.healthStatus && alertStatuses.includes(animal.healthStatus);

    if (isHealthAlert) {
      const manager = animal.addedBy;
      if (manager) {
        const managerId = manager._id || manager;
        await Notification.create({
          recipient: managerId,
          type: 'livestock_alert',
          title: 'Animal Health Alert',
          message: `${animal.species} ${animal.animalId} has been marked as ${animal.healthStatus}. Immediate veterinary attention may be required.`
        });
      }

      const worker = await User.findOne({ role: 'worker', isActive: true });
      if (worker) {
        const task = await Task.create({
          title: `Health check — ${animal.animalId} (${animal.species})`,
          description: `${animal.animalId} has been flagged as ${animal.healthStatus}. Please monitor closely and report any changes to the farm manager.`,
          priority: animal.healthStatus === 'Sick' ? 'High' : 'Medium',
          assignedTo: worker._id,
          assignedBy: manager?._id || manager || req.user.id,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          category: 'Inspection',
          status: 'Pending'
        });

        await Notification.create({
          recipient: worker._id,
          type: 'task_assigned',
          title: 'New Health Check Task',
          message: `${animal.animalId} requires a health check. Please inspect and report back.`,
          relatedTask: task._id
        });
      }
    }

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

// @desc   Add daily check
// @route  POST /api/livestock/:id/daily-check
const addDailyCheck = async (req, res) => {
  try {
    const animal = await Livestock.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });

    animal.dailyChecks.push({ ...req.body, checkedBy: req.user.id });

    if (req.body.isMissing) {
      animal.healthStatus = 'Sick';
      await Notification.create({
        recipient: animal.addedBy,
        type: 'livestock_alert',
        title: 'Missing Animal Alert',
        message: `${animal.species} ${animal.animalId} has been reported missing during daily check.`
      });
    }

    await animal.save();
    res.status(201).json(animal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Add treatment
// @route  POST /api/livestock/:id/treatments
const addTreatment = async (req, res) => {
  try {
    const animal = await Livestock.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });

    animal.treatments.push(req.body);
    await animal.save();

    if (req.body.nextDueDate) {
      await Notification.create({
        recipient: animal.addedBy,
        type: 'livestock_alert',
        title: `${req.body.type} Scheduled`,
        message: `Next ${req.body.type} for ${animal.animalId} is due on ${new Date(req.body.nextDueDate).toLocaleDateString()}.`
      });
    }

    res.status(201).json(animal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Add mating record
// @route  POST /api/livestock/:id/matings
const addMating = async (req, res) => {
  try {
    const animal = await Livestock.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });

    const gestationDays = {
      Cattle: 283,
      Goat: 150,
      Sheep: 147,
      Pig: 114,
      Other: 180
    };
    const days = gestationDays[animal.species] || 180;
    const matingDate = new Date(req.body.matingDate);
    const expectedBirthDate = new Date(matingDate.getTime() + days * 24 * 60 * 60 * 1000);

    animal.matings.push({
      ...req.body,
      expectedBirthDate,
      status: 'Pregnant'
    });
    await animal.save();

    await Notification.create({
      recipient: animal.addedBy,
      type: 'livestock_alert',
      title: 'Pregnancy Recorded',
      message: `${animal.animalId} mated on ${matingDate.toLocaleDateString()}. Expected birth: ${expectedBirthDate.toLocaleDateString()} (${days} day gestation).`
    });

    res.status(201).json(animal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get treatments due in the next 7 days
// @route  GET /api/livestock/due-treatments
const getDueTreatments = async (req, res) => {
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const animals = await Livestock.find({ isArchived: false });
    const due = [];

    animals.forEach((animal) => {
      animal.treatments.forEach((treatment) => {
        if (treatment.nextDueDate && new Date(treatment.nextDueDate) <= sevenDaysFromNow) {
          due.push({
            animalId: animal.animalId,
            species: animal.species,
            treatmentType: treatment.type,
            drugName: treatment.drugName,
            dueDate: treatment.nextDueDate,
            animalObjectId: animal._id
          });
        }
      });

      animal.vetAppointments.forEach((appointment) => {
        if (!appointment.completed && appointment.date && new Date(appointment.date) <= sevenDaysFromNow) {
          due.push({
            animalId: animal.animalId,
            species: animal.species,
            treatmentType: 'Vet Appointment',
            drugName: appointment.reason,
            dueDate: appointment.date,
            animalObjectId: animal._id
          });
        }
      });
    });

    due.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    res.json(due);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get active pregnancies
// @route  GET /api/livestock/pregnancies
const getPregnancies = async (req, res) => {
  try {
    const animals = await Livestock.find({ isArchived: false });
    const pregnancies = [];

    animals.forEach((animal) => {
      animal.matings.forEach((mating) => {
        if (mating.status === 'Pregnant') {
          const daysUntilBirth = Math.ceil((new Date(mating.expectedBirthDate) - Date.now()) / (1000 * 60 * 60 * 24));
          pregnancies.push({
            animalId: animal.animalId,
            species: animal.species,
            matingDate: mating.matingDate,
            expectedBirthDate: mating.expectedBirthDate,
            daysUntilBirth,
            status: daysUntilBirth < 0 ? 'Overdue' : 'Pregnant',
            matingId: mating._id,
            animalObjectId: animal._id
          });
        }
      });
    });

    pregnancies.sort((a, b) => a.daysUntilBirth - b.daysUntilBirth);
    res.json(pregnancies);
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

module.exports = {
  getLivestock,
  getLivestockById,
  addLivestock,
  updateLivestock,
  archiveLivestock,
  addVaccination,
  addDailyCheck,
  addTreatment,
  addMating,
  getDueTreatments,
  getPregnancies,
  getLivestockStats
};
