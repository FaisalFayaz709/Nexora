import { readWorkerConfig } from './config/worker-config.js';
import { createWorkerRuntime } from './lifecycle/worker-runtime.js';
import { createDefaultWorkerPorts } from './processors/ports.js';
import { createProcessorRegistry } from './processors/processor-registry.js';
import { QUEUE_NAME_VALUES } from './queues/queue-names.js';
import { createRedisConnection } from './redis/redis-connection.js';
import { registerScheduledJobs } from './schedulers/scheduler-registry.js';

const config = readWorkerConfig();
const connection = createRedisConnection(config.REDIS_URL);
const ports = createDefaultWorkerPorts(config);
const processors = createProcessorRegistry(ports);
const runtime = createWorkerRuntime({ connection, config, processors });

if (config.WORKER_SCHEDULERS_ENABLED) {
  await registerScheduledJobs(runtime.queues);
}

console.info('NEXORA BullMQ worker runtime started', {
  queues: QUEUE_NAME_VALUES,
  concurrency: config.WORKER_CONCURRENCY,
  schedulersEnabled: config.WORKER_SCHEDULERS_ENABLED,
});

async function shutdown(signal: string): Promise<void> {
  console.info('worker shutdown requested', { signal });
  await runtime.close();
  await connection.quit();
  console.info('worker shutdown complete', { signal });
}

process.once('SIGINT', () => {
  shutdown('SIGINT').catch((error: unknown) => {
    console.error('worker shutdown failed', error);
    process.exitCode = 1;
  });
});

process.once('SIGTERM', () => {
  shutdown('SIGTERM').catch((error: unknown) => {
    console.error('worker shutdown failed', error);
    process.exitCode = 1;
  });
});
