const User = require('./models/User');
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
      const workers = await User.find({ role: 'worker', isActive: true });
      for (const worker of workers) {
        await recalculateWorkerScore(worker._id);
      }
      console.log(`✅ Trust score recalculation completed for ${workers.length} workers`);
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
