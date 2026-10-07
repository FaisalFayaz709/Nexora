import { ProjectResourceFormPage } from '@/modules/projects/project-resource-form-page';
import { getProjectResourceConfig } from '@/modules/projects/project-resource-config';

export default function Page() {
  return <ProjectResourceFormPage resource={getProjectResourceConfig('project-tasks')} mode="create" />;
}
