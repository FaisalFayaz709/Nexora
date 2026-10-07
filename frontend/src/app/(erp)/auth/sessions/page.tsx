import { EntityList } from '@/modules/masters/entity-list';

export default function Page() {
  return (
    <EntityList
      title="Active Sessions"
      endpoint="/auth/sessions"
      description="Review and revoke server-side sessions without exposing refresh-token hashes."
    />
  );
}
