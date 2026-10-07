import { Queue, type JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES, type QueueName } from '@nexora/shared';

export interface QueueProducerConfig {
  readonly redisUrl: string;
  readonly attempts: number;
  readonly backoffMs: number;
}

export interface EnqueueJobInput<TPayload extends Record<string, unknown>> {
  readonly queueName: QueueName;
  readonly jobName: string;
  readonly payload: TPayload;
  readonly jobId?: string;
}

export class QueueProducer {
  private readonly connection: IORedis;
  private readonly queues = new Map<QueueName, Queue>();
  private readonly defaultOptions: JobsOptions;

  constructor(config: QueueProducerConfig) {
    this.connection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    this.defaultOptions = {
      attempts: config.attempts,
      backoff: {
        type: 'exponential',
        delay: config.backoffMs,
      },
      removeOnComplete: { age: 86_400 },
      removeOnFail: { age: 604_800 },
    };
  }

  async enqueue<TPayload extends Record<string, unknown>>(input: EnqueueJobInput<TPayload>): Promise<string | undefined> {
    const queue = this.getQueue(input.queueName);
    const options: JobsOptions = input.jobId
      ? { ...this.defaultOptions, jobId: input.jobId }
      : this.defaultOptions;
    const job = await queue.add(input.jobName, input.payload, options);
    return job.id;
  }

  async enqueueNotification(payload: Record<string, unknown>, jobId?: string): Promise<string | undefined> {
    return this.enqueue({ queueName: QUEUE_NAMES.notificationCreate, jobName: 'notification.create', payload, jobId });
  }

  async enqueueEmail(payload: Record<string, unknown>, jobId?: string): Promise<string | undefined> {
    return this.enqueue({ queueName: QUEUE_NAMES.emailSend, jobName: 'email.send', payload, jobId });
  }

  async enqueueWebhook(payload: Record<string, unknown>, jobId?: string): Promise<string | undefined> {
    return this.enqueue({ queueName: QUEUE_NAMES.webhookDeliver, jobName: 'webhook.deliver', payload, jobId });
  }

  async enqueueReportExport(payload: Record<string, unknown>, jobId?: string): Promise<string | undefined> {
    return this.enqueue({ queueName: QUEUE_NAMES.reportExport, jobName: 'report.export', payload, jobId });
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    await this.connection.quit();
  }

  private getQueue(queueName: QueueName): Queue {
    const existing = this.queues.get(queueName);
    if (existing) return existing;
    const queue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: this.defaultOptions,
    });
    this.queues.set(queueName, queue);
    return queue;
  }
}
