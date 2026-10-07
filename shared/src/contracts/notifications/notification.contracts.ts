import { z } from 'zod';
import { PageQuerySchema } from '../common';
export const NotificationListQuerySchema = PageQuerySchema.extend({ unreadOnly: z.coerce.boolean().optional() });
export const NotificationReadSchema = z.object({ read: z.boolean().default(true) });
