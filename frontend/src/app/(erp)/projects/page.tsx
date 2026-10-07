import { ProjectResourceList } from '@/modules/projects/project-resource-list';
import { getProjectResourceConfig } from '@/modules/projects/project-resource-config';

export default function ProjectsPage() {
  return <ProjectResourceList resource={getProjectResourceConfig('projects')} />;
}
