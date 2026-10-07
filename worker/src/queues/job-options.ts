import type { JobsOptions } from 'bullmq';
import type { WorkerConfig } from '../config/worker-config.js';

export function defaultJobOptions(config: WorkerConfig): JobsOptions {
  return {
    attempts: config.WORKER_JOB_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: config.WORKER_JOB_BACKOFF_MS,
    },
    removeOnComplete: {
      age: config.WORKER_REMOVE_COMPLETE_AGE_SECONDS,
    },
    removeOnFail: {
      age: config.WORKER_REMOVE_FAILED_AGE_SECONDS,
    },
  };
}
