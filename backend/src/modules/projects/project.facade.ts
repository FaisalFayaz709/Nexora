import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { AppError } from '../../core/http/errors.js';
import { ProjectRepository } from './project.repository.js';

export class ProjectFacade {
  constructor(private readonly repository = new ProjectRepository()) {}

  async assertProject(
    organizationId: string,
    projectId: string,
  ) {
    const row = await this.repository.get(organizationId, projectId);
    if (!row) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }
    return row;
  }

  projectBelongsToOrganization(
    organizationId: string,
    projectId: string,
  ) {
    return this.repository.get(organizationId, projectId).then(Boolean);
  }
}
