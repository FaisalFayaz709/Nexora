import { EntityList } from '@/modules/masters/entity-list';
export default function SaasPage() {
  return <EntityList title="SaaS Billing" endpoint="/saas/plans" columns={[{ key: 'key', label: 'Key' },{ key: 'name', label: 'Plan' },{ key: 'active', label: 'Active' },{ key: 'updatedAt', label: 'Updated' }]} />;
}
