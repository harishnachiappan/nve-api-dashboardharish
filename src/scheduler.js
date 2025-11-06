const cron = require('node-cron');
const { incrementalSync } = require('./services/ingest');

const startScheduler = () => {
  cron.schedule('30 0 * * *', async () => {
    console.log('Running scheduled incremental sync...');
    try {
      await incrementalSync(24);
    } catch (error) {
      console.error('Scheduled sync failed:', error.message);
    }
  });
  
  console.log('✓ Scheduler started (daily at 00:30)');
};

module.exports = { startScheduler };
