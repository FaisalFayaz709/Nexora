import { PlatformScopedSurface } from '@/modules/platform/platform-scoped-surface';

export default function Page({ params }: { params: { id: string; jobId: string } }) {
  return <PlatformScopedSurface kind="document-versions" recordId={params.id} />;
}
