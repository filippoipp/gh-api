import { createConnections, getConnection } from 'typeorm';

import { LoggerSingleton } from '../../config/logger-config';

const logger = LoggerSingleton.getLogger();
const nameDb = (process.env.NODE_ENV !== 'prod' && 'prod') || 'default';

export const startConnection = async () => {
  await createConnections()
    .then(() => logger.info('Database connections started.'))
    .catch((err: Error) => {
      logger.info(err);
      throw err;
    });
};

export const closeConnection = () => getConnection(nameDb).close();
