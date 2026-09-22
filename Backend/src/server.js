const app = require('./app');
const connectDB = require('./config/db');
const { env, validateEnv } = require('./config/env');
const { releaseExpiredReservations } = require('./services/reservation.service');
const logger = require('./config/logger');

const RESERVATION_SWEEP_MS = 5 * 60 * 1000;
const HEALTH_PING_MS = 14 * 60 * 1000;

const startServer = async () => {
  try {
    validateEnv();
    await connectDB();

    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port} (${env.nodeEnv})`);
    });

    const healthUrl = `http://127.0.0.1:${env.port}/`;
    const pingHealth = () => {
      fetch(healthUrl).catch((error) =>
        logger.warn({ err: error }, 'Health self-ping failed')
      );
    };
    setInterval(pingHealth, HEALTH_PING_MS).unref();

    setInterval(() => {
      releaseExpiredReservations().catch((error) =>
        logger.error({ err: error }, 'Reservation sweep failed')
      );
    }, RESERVATION_SWEEP_MS).unref();
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
