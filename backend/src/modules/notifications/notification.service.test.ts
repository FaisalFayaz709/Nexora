import { describe, expect, it } from 'vitest';
import { NotificationListQuerySchema } from '@nexora/shared';
describe('Notification contracts',()=>{it('supports unreadOnly filter',()=>{expect(NotificationListQuerySchema.parse({unreadOnly:'true'}).unreadOnly).toBe(true);});});
