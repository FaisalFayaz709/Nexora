import { ProjectScopedSurface } from '@/modules/projects/project-scoped-surface';
import { getProjectScopedSurfaceConfig } from '@/modules/projects/project-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <ProjectScopedSurface projectId={params.id} surface={getProjectScopedSurfaceConfig('bom')} />;
}
