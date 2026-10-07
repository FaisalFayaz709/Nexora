import { ProjectResourceDetail } from '@/modules/projects/project-resource-detail';
import { getProjectResourceConfig } from '@/modules/projects/project-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <ProjectResourceDetail resource={getProjectResourceConfig('project-tasks')} recordId={params.id} />;
}
