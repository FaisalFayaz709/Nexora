import { Queue, QueueEvents, Worker, type QueueOptions, type WorkerOptions } from 'bullmq';
import type IORedis from 'ioredis';
import type { WorkerConfig } from '../config/worker-config.js';
import { defaultJobOptions } from '../queues/job-options.js';
import { QUEUE_NAME_VALUES, type QueueName } from '../queues/queue-names.js';
import type { QueueProcessor } from '../processors/processor-registry.js';

export interface WorkerRuntime {
  readonly queues: Map<QueueName, Queue>;
  readonly workers: Map<QueueName, Worker>;
  readonly queueEvents: Map<QueueName, QueueEvents>;
  close(): Promise<void>;
}

export function createWorkerRuntime(params: {
  readonly connection: IORedis;
  readonly config: WorkerConfig;
  readonly processors: Record<QueueName, QueueProcessor>;
}): WorkerRuntime {
  const queueOptions: QueueOptions = {
    connection: params.connection,
    defaultJobOptions: defaultJobOptions(params.config),
  };
  const workerOptions: WorkerOptions = {
    connection: params.connection,
    concurrency: params.config.WORKER_CONCURRENCY,
  };

  const queues = new Map<QueueName, Queue>();
  const workers = new Map<QueueName, Worker>();
  const queueEvents = new Map<QueueName, QueueEvents>();

  for (const queueName of QUEUE_NAME_VALUES) {
    const queue = new Queue(queueName, queueOptions);
    const worker = new Worker(queueName, params.processors[queueName], workerOptions);
    const events = new QueueEvents(queueName, { connection: params.connection });

    worker.on('completed', (job, result) => {
      console.info('worker job completed', { queueName, jobId: job.id, result });
    });
    worker.on('failed', (job, error) => {
      console.error('worker job failed', { queueName, jobId: job?.id, error: error.message });
    });
    events.on('stalled', ({ jobId }) => {
      console.warn('worker job stalled', { queueName, jobId });
    });

    queues.set(queueName, queue);
    workers.set(queueName, worker);
    queueEvents.set(queueName, events);
  }

  return {
    queues,
    workers,
    queueEvents,
    async close() {
      await Promise.all([...workers.values()].map((worker) => worker.close()));
      await Promise.all([...queueEvents.values()].map((events) => events.close()));
      await Promise.all([...queues.values()].map((queue) => queue.close()));
    },
  };
}
