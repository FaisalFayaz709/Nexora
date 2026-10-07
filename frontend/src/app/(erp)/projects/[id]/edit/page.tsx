import { ProjectResourceFormPage } from '@/modules/projects/project-resource-form-page';
import { getProjectResourceConfig } from '@/modules/projects/project-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <ProjectResourceFormPage resource={getProjectResourceConfig('projects')} mode="edit" recordId={params.id} />;
}
