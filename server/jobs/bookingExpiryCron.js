const cron = require('node-cron');
const logger = require('../utils/logger');

/**
 * Schedules the booking pending-request expiry job.
 * Runs once on start (after DB ready) and hourly via cron with explicit error logging.
 *
 * @param {{ run: () => Promise<{ expired?: number }> }} deps
 * @returns {{ stop: () => void }}
 */
function startBookingExpiryJob({ run }) {
  let stopped = false;

  const execute = async (label) => {
    if (stopped) return;
    try {
      const result = await run();
      const n = result?.expired ?? 0;
      if (n > 0) {
        logger.info(`[Booking expiry] ${label}: expired ${n} pending request(s)`);
      }
    } catch (e) {
      logger.error(`[Booking expiry] ${label} failed:`, e);
    }
  };

  void execute('initial run');

  const task = cron.schedule(
    '0 * * * *',
    () => {
      void execute('scheduled run');
    },
    { timezone: 'UTC' }
  );

  logger.info('[Booking expiry] Cron scheduled (UTC hourly at :00)');

  return {
    stop: () => {
      stopped = true;
      task.stop();
      logger.info('[Booking expiry] Cron stopped');
    },
  };
}

module.exports = { startBookingExpiryJob };
