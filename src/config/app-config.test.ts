describe('Test app config', () => {
  const { env } = process;

  beforeEach(() => {
    jest.resetModules();
    process.env = env;
  });

  afterAll(() => {
    process.env = env;
  });

  test('Should return the environment variable configuration SERVERS', async () => {
    const Config = (await import('./app-config')).default;

    expect(Config.SERVERS.http.hostname).toEqual('0.0.0.0');
    expect(Config.SERVERS.http.port).toEqual(3333);
  });

  test('Should return the default configuration SERVERS', async () => {
    process.env.HTTP_HOST = '';
    process.env.HTTP_PORT = '';
    const Config = (await import('./app-config')).default;

    expect(Config.SERVERS.http.hostname).toEqual('localhost');
    expect(Config.SERVERS.http.port).toEqual(3000);
  });

  test('Should return the default configuration APM', async () => {
    process.env.ELASTIC_APM_SECRET_TOKEN = 'ELASTIC_APM_SECRET_TOKEN';
    process.env.ELASTIC_APM_SERVER_URL = 'ELASTIC_APM_SERVER_URL';
    const Config = (await import('./app-config')).default;

    expect(Config.APM.serviceToken).toEqual('ELASTIC_APM_SECRET_TOKEN');
    expect(Config.APM.serviceUrl).toEqual('ELASTIC_APM_SERVER_URL');
  });

  test('Should return the default configuration SENTRY', async () => {
    process.env.SENTRY_DSN = 'SENTRY_DSN';
    process.env.SENTRY_MIN_LEVEL = 'SENTRY_MIN_LEVEL';
    const Config = (await import('./app-config')).default;

    expect(Config.SENTRY.dsn).toEqual('SENTRY_DSN');
    expect(Config.SENTRY.minLevel).toEqual('SENTRY_MIN_LEVEL');
  });

  test('Should return the default configuration KEYCLOAK', async () => {
    process.env.KEYCLOAK_REALM = 'KEYCLOAK_REALM';
    process.env.KEYCLOAK_API_HOST = 'KEYCLOAK_API_HOST';
    process.env.KEYCLOAK_REALM_PUBLIC_KEY = 'KEYCLOAK_REALM_PUBLIC_KEY';
    process.env.KEYCLOAK_CLIENT_ID = 'KEYCLOAK_CLIENT_ID';
    process.env.KEYCLOAK_REDIRECT_URI = 'KEYCLOAK_REDIRECT_URI';
    process.env.KEYCLOAK_CLIENT_SECRET = 'KEYCLOAK_CLIENT_SECRET';
    const Config = (await import('./app-config')).default;

    expect(Config.KEYCLOAK.realm).toEqual('KEYCLOAK_REALM');
    expect(Config.KEYCLOAK.hostname).toEqual('KEYCLOAK_API_HOST');
    expect(Config.KEYCLOAK.publicKey).toEqual('KEYCLOAK_REALM_PUBLIC_KEY');
    expect(Config.KEYCLOAK.clientId).toEqual('KEYCLOAK_CLIENT_ID');
    expect(Config.KEYCLOAK.redirectUri).toEqual('KEYCLOAK_REDIRECT_URI');
    expect(Config.KEYCLOAK.clientSecret).toEqual('KEYCLOAK_CLIENT_SECRET');
  });

  test('Should return the default configuration NOTIFICATION', async () => {
    process.env.NOTIFICATION_API_HOST = 'NOTIFICATION_API_HOST';
    const Config = (await import('./app-config')).default;

    expect(Config.NOTIFICATION.hostname).toEqual('NOTIFICATION_API_HOST');
    expect(Config.NOTIFICATION.paths.mail).toEqual('private/v1/notifications/mail');
  });

  test('Should return the default configuration REDIS', async () => {
    process.env.REDIS_HOST = 'REDIS_HOST';
    process.env.REDIS_PORT = '3000';
    process.env.REDIS_PASSWORD = 'REDIS_PASSWORD';
    process.env.REDIS_EXPIRATION_TIME = '3600';
    const Config = (await import('./app-config')).default;

    expect(Config.REDIS.host).toEqual('REDIS_HOST');
    expect(Config.REDIS.port).toEqual(3000);
    expect(Config.REDIS.password).toEqual('REDIS_PASSWORD');
    expect(Config.REDIS.expirationTime).toEqual(3600);
  });

  test('Should return the environment variable configuration TOTP', async () => {
    const Config = (await import('./app-config')).default;

    expect(Config.TOTP.digits).toEqual(6);
    expect(Config.TOTP.period).toEqual(120);
  });

  test('Should return the default configuration TOTP', async () => {
    process.env.TOTP_DIGITS = '';
    process.env.TOTP_PERIOD = '';
    const Config = (await import('./app-config')).default;

    expect(Config.TOTP.digits).toEqual(6);
    expect(Config.TOTP.period).toEqual(60);
  });
});
