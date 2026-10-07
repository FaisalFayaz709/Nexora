import { QUEUE_NAME_VALUES, QUEUE_NAMES, type QueueName, type QueueNameKey } from '@nexora/shared';

export { QUEUE_NAME_VALUES, QUEUE_NAMES, type QueueName, type QueueNameKey };

export function isQueueName(value: string): value is QueueName {
  return QUEUE_NAME_VALUES.includes(value as QueueName);
}
