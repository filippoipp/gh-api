import env from 'dotenv';
import path from 'path';

env.config({
  path: path.join(__dirname, `../../env/.env.${process.env.NODE_ENV}`),
});
process.env.ENVIRONMENT = process.env.ENVIRONMENT || process.env.NODE_ENV;

class Config {
  public static DEV: boolean = process.env.ENVIRONMENT === 'dev';

  public static TEST: boolean = process.env.NODE_ENV === 'test';

  public static SERVERS = {
    http: {
      hostname: process.env.HTTP_HOST || 'localhost',
      port: parseInt(process.env.HTTP_PORT, 10) || 3000,
    },
  };
}

export default Config;
