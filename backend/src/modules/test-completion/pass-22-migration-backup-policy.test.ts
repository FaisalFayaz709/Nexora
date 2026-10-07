import { describe, expect, it } from 'vitest';
import { PASS_22_REQUIRED_LAYER_EVIDENCE } from './pass-22-testing-completion-policy.js';

describe('PASS_22 migration and backup recovery obligations', () => {
  it('requires migration/seed and backup/restore commands as blocking evidence', () => {
    const byLayer = new Map(PASS_22_REQUIRED_LAYER_EVIDENCE.map((layer) => [layer.layer, layer]));
    expect(byLayer.get('MIGRATION_SCHEMA_EVOLUTION')?.command).toContain('db:migrate:deploy');
    expect(byLayer.get('BACKUP_RESTORE_OPERATIONAL_RECOVERY')?.command).toContain('backup-restore-certify.sh');
  });
});
