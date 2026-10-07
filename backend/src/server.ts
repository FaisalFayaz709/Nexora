import { buildApp } from './app.js';
import { readEnv } from './config/env.js';

const env = readEnv();
const app = buildApp(env);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutdown requested');
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await app.listen({ host: '0.0.0.0', port: env.API_PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
