const User = require('./models/User');
const Farm = require('./models/Farm');
const { recalculateWorkerScore } = require('./controllers/trustScoreController');

const startScheduler = () => {
  const getDelay = () => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(23, 55, 0, 0);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
  };

  const run = async () => {
    try {
      console.log('🕒 Running scheduled trust score recalculation');
      // Run farm by farm so every read and any alert stays inside one farm.
      const farms = await Farm.find({ isActive: true }).select('_id name');
      let total = 0;
      for (const farm of farms) {
        try {
          const workers = await User.find({ farm: farm._id, role: 'worker', isActive: true }).select('_id');
          for (const worker of workers) {
            await recalculateWorkerScore(worker._id, null, { farm: farm._id });
          }
          total += workers.length;
        } catch (farmError) {
          console.error(`⚠️ Trust score recalculation failed for farm ${farm.name}:`, farmError.message);
        }
      }
      console.log(`✅ Trust score recalculation completed for ${total} workers across ${farms.length} farms`);
    } catch (error) {
      console.error('⚠️ Scheduled trust score recalculation failed:', error.message);
    }
  };

  setTimeout(() => {
    run();
    setInterval(run, 24 * 60 * 60 * 1000);
  }, getDelay());
};

module.exports = { startScheduler };
