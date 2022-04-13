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

    expect(Config.SERVERS.http.hostname).toEqual('0.0.0.0');
    expect(Config.SERVERS.http.port).toEqual(3000);
  });
});
