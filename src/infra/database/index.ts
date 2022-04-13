import { createConnections, getConnection } from 'typeorm';

const nameDb = (process.env.NODE_ENV !== 'prod' && 'prod') || 'default';

export const startConnection = async () => {
  await createConnections()
    .then(() => console.info('Database connection started.'))
    .catch((err: Error) => {
      throw err;
    });
};

export const closeConnection = () => getConnection(nameDb).close();
