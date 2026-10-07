import { ProjectResourceList } from '@/modules/projects/project-resource-list';
import { getProjectResourceConfig } from '@/modules/projects/project-resource-config';

export default function ProjectTasksPage() {
  return <ProjectResourceList resource={getProjectResourceConfig('project-tasks')} />;
}
