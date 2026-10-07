import type { TransactionClient } from '@nexora/database';
import { ImportTemplateService } from './import-template.service.js';
export class ImportTemplateFacade{constructor(private readonly service=new ImportTemplateService()){} ensureBusinessMasterBaseline(tx:TransactionClient,organizationId:string){return this.service.ensureBusinessMasterBaseline(tx,organizationId);}}
