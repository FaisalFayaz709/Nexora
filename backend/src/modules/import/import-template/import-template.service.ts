import type { TransactionClient } from '@nexora/database';
import { ImportTemplateRepository } from './import-template.repository.js';

export const BUSINESS_MASTER_IMPORT_TEMPLATES = [
  {subjectType:'EMPLOYEE',name:'Employee Master',columns:['employeeNo','name','branchId','departmentId','userId','managerId','jobTitle','joiningDate','employmentType']},
  {subjectType:'CUSTOMER',name:'Customer Master',columns:['code','name','taxNo','billingAddressId','creditLimit','primaryContact.name','primaryContact.email','primaryContact.phone']},
  {subjectType:'CUSTOMER_SITE',name:'Customer Site Master',columns:['customerId','code','name','addressId']},
  {subjectType:'VENDOR',name:'Vendor Master',columns:['code','name','taxNo','paymentTerms','billingAddressId','primaryContact.name','primaryContact.email','primaryContact.phone']},
  {subjectType:'PRODUCT_CATEGORY',name:'Product Category Master',columns:['name','parentId']},
  {subjectType:'UNIT_OF_MEASURE',name:'Unit Of Measure Master',columns:['code','name','precision']},
  {subjectType:'PRODUCT',name:'Product Master',columns:['categoryId','sku','name','unitId','trackingType','brand','model','barcode','standardCost','salesPrice','minStock','maxStock']},
  {subjectType:'WAREHOUSE',name:'Warehouse Master',columns:['branchId','code','name','status']},
  {subjectType:'INVENTORY',name:'Opening Stock',columns:['warehouseId','locationId','productId','onHand','reserved']},
] as const;

export class ImportTemplateService {
  constructor(private readonly repository = new ImportTemplateRepository()) {}

  async ensureBusinessMasterBaseline(tx: TransactionClient, organizationId: string) {
    const repo = this.repository.withDb(tx);
    for (const template of BUSINESS_MASTER_IMPORT_TEMPLATES) {
      await repo.upsertBaseline({ organizationId, ...template });
    }
  }
}
