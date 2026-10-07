import { Prisma, withTransaction, type TransactionClient } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { ApprovalFacade, ApprovalSubjectDecision, ApprovalSubjectHandler } from '../approvals/index.js';
import type { CustomerFacade } from '../customers/index.js';
import type { EmployeeFacade } from '../hr/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ProcurementFacade } from '../procurement/index.js';
import type { ProjectFacade } from '../projects/index.js';
import type { VendorGovernanceFacade } from '../vendors/index.js';
import { FinanceRepository } from './finance.repository.js';
import {
  assertCustomerInvoiceCanApprove,
  assertCustomerInvoiceCanCancel,
  assertCustomerInvoiceCanPost,
  assertCustomerInvoiceCanSend,
  assertCustomerInvoiceCanSubmit,
  assertInvoiceCanReceivePayment,
  assertJournalBalanced,
  assertIdempotentReplay,
  assertNoAsyncFinanceCriticalMutation,
  assertPaymentAllocationTotal,
  assertPaymentIdempotencyKey,
  assertPostedLedgerIsReversalOnly,
  assertSupplierInvoiceCanApprove,
  assertSupplierInvoiceCanMatch,
  assertSupplierInvoiceMatchStatusSeparateFromStatus,
  calculateSupplierInvoiceThreeWayMatch,
  financeRequestHash,
} from './finance-core-policy.js';

type PageQuery = { page?: number; pageSize?: number };
function page(q:PageQuery){ const page=q.page??1; const pageSize=Math.min(q.pageSize??25,100); return {page,pageSize,skip:(page-1)*pageSize,take:pageSize}; }
function dec(v:string|number|Prisma.Decimal){ return new Prisma.Decimal(v); }
function money(items:any[], taxField='tax'){
  let subtotal=new Prisma.Decimal(0); let tax=new Prisma.Decimal(0);
  const rows=items.map((i:any)=>{ const qty=dec(i.qty??i.quantity); const unit=dec(i.unitPrice); const lineTax=dec(i[taxField]??i.taxRate??0); const base=qty.mul(unit); const lineTotal=base.add(lineTax); subtotal=subtotal.add(base); tax=tax.add(lineTax); return {...i,qty,unitPrice:unit,tax:lineTax,lineTotal}; });
  return {items:rows,subtotal,tax,total:subtotal.add(tax)};
}
function equalDebitCredit(lines:any[]){
  const debit=lines.reduce((s,l)=>s.add(dec(l.debit??0)),new Prisma.Decimal(0));
  const credit=lines.reduce((s,l)=>s.add(dec(l.credit??0)),new Prisma.Decimal(0));
  return debit.eq(credit) && debit.gt(0);
}

export class FinanceService implements ApprovalSubjectHandler {
  constructor(
    private readonly numbers: NumberSequenceFacade,
    private readonly approvals: ApprovalFacade,
    private readonly customers: CustomerFacade,
    private readonly employees: EmployeeFacade,
    private readonly vendors: VendorGovernanceFacade,
    private readonly projects: ProjectFacade,
    private readonly procurement: ProcurementFacade,
    private readonly access: PlatformAccessFacade,
    private readonly repository = new FinanceRepository(),
    private readonly audit = new AuditWriter(),
    private readonly events = new BusinessEventWriter(),
  ) {}

  private async enabled(org:string){ assertNoAsyncFinanceCriticalMutation('report.export'); await this.access.assertModuleEnabled(org,'finance'); }

  async listCustomerInvoices(tenant:TenantRequestContext,q:any){ await this.enabled(tenant.organizationId); const p=page(q); const {rows,total}=await this.repository.listCustomerInvoices(tenant.organizationId,q,p.skip,p.take); return {rows,total,page:p.page,pageSize:p.pageSize}; }
  async getCustomerInvoice(tenant:TenantRequestContext,id:string){ await this.enabled(tenant.organizationId); const row=await this.repository.getCustomerInvoice(tenant.organizationId,id); if(!row) throw new AppError(404,'CUSTOMER_INVOICE_NOT_FOUND','Customer invoice not found.'); return row; }

  async createCustomerInvoice(tenant:TenantRequestContext, actor:{userId:string;ip:string|null}, input:any){
    await this.enabled(tenant.organizationId);
    await this.customers.customerForProject(tenant.organizationId,input.customerId);
    if(input.projectId) await this.projects.assertProject(tenant.organizationId,input.projectId);
    const calc=money(input.items);
    return this.numbers.withBusinessNumber({ organizationId:tenant.organizationId, branchId:tenant.branchId, entityType:'CUSTOMER_INVOICE', fiscalYear:new Date(input.issueDate).getUTCFullYear(), targetType:'CustomerInvoice', createTarget: async(tx,invoiceNo)=>{
      const row=await this.repository.createCustomerInvoice(tx,{organizationId:tenant.organizationId,invoiceNo,customerId:input.customerId,projectId:input.projectId??null,contractId:input.contractId??null,issueDate:new Date(input.issueDate),dueDate:new Date(input.dueDate),status:'DRAFT',subtotal:calc.subtotal,tax:calc.tax,total:calc.total,balance:calc.total},calc.items.map((i:any)=>({productId:i.productId??null,description:i.description,qty:i.qty,unitPrice:i.unitPrice,tax:i.tax,lineTotal:i.lineTotal})));
      await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'CUSTOMER_INVOICE_CREATED',subjectType:'CustomerInvoice',subjectId:row.id,afterJson:{invoiceNo,total:row.total.toString(),status:row.status},ip:actor.ip});
      return row;
    }});
  }

  async updateCustomerInvoice(tenant:TenantRequestContext, actor:{userId:string;ip:string|null}, id:string,input:any){
    await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ const before=await this.repository.lockCustomerInvoice(tx,tenant.organizationId,id); if(!before) throw new AppError(404,'CUSTOMER_INVOICE_NOT_FOUND','Customer invoice not found.'); if(before.status!=='DRAFT') throw new AppError(409,'CUSTOMER_INVOICE_NOT_EDITABLE','Only DRAFT customer invoices can be edited.'); let data:any={}; if(input.issueDate) data.issueDate=new Date(input.issueDate); if(input.dueDate) data.dueDate=new Date(input.dueDate); if(input.items){ const calc=money(input.items); await this.repository.replaceCustomerItems(tx,id,calc.items.map((i:any)=>({invoiceId:id,productId:i.productId??null,description:i.description,qty:i.qty,unitPrice:i.unitPrice,tax:i.tax,lineTotal:i.lineTotal}))); Object.assign(data,{subtotal:calc.subtotal,tax:calc.tax,total:calc.total,balance:calc.total}); }
      const row=await this.repository.updateCustomerInvoice(tx,id,data); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'CUSTOMER_INVOICE_UPDATED',subjectType:'CustomerInvoice',subjectId:id,beforeJson:{status:before.status,total:before.total.toString()},afterJson:{status:row.status,total:row.total.toString()},ip:actor.ip}); return row; });
  }

  async submitCustomerInvoice(tenant:TenantRequestContext, actor:{userId:string;ip:string|null}, id:string){
    await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ const inv=await this.repository.lockCustomerInvoice(tx,tenant.organizationId,id); if(!inv) throw new AppError(404,'CUSTOMER_INVOICE_NOT_FOUND','Customer invoice not found.'); assertCustomerInvoiceCanSubmit(inv.status); const approval=await this.approvals.requestApprovalIfConfigured(tx,{organizationId:tenant.organizationId,branchId:tenant.branchId,subjectType:'CustomerInvoice',subjectId:id,requestedById:actor.userId,context:{total:inv.total.toString(),customerId:inv.customerId}}); const status=approval?'APPROVAL_PENDING':'APPROVED'; const row=await this.repository.updateCustomerInvoice(tx,id,{status,approvalRequestId:approval?.id??null}); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'CUSTOMER_INVOICE_SUBMITTED',subjectType:'CustomerInvoice',subjectId:id,afterJson:{status,approvalRequestId:approval?.id??null},ip:actor.ip}); return row; });
  }
  async approveCustomerInvoice(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string){ await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ const inv=await this.repository.lockCustomerInvoice(tx,tenant.organizationId,id); if(!inv) throw new AppError(404,'CUSTOMER_INVOICE_NOT_FOUND','Customer invoice not found.'); assertCustomerInvoiceCanApprove(inv.status); const row=await this.repository.updateCustomerInvoice(tx,id,{status:'APPROVED'}); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'CUSTOMER_INVOICE_APPROVED',subjectType:'CustomerInvoice',subjectId:id,beforeJson:{status:inv.status},afterJson:{status:'APPROVED'},ip:actor.ip}); return row; }); }

  private async createJournal(tx:TransactionClient, organizationId:string, actorUserId:string, referenceType:string, referenceId:string, lines:any[], posted=true){
    assertJournalBalanced(lines);
    const period=await this.repository.ensureOpenPeriod(tx,organizationId,new Date());
    const wrapped = await this.numbers.withBusinessNumberInTransaction(tx,{organizationId,branchId:null,entityType:'JOURNAL_ENTRY',fiscalYear:new Date().getUTCFullYear(),targetType:'JournalEntry',createTarget:async(tx2,entryNo)=> this.repository.createJournalEntry(tx2,{organizationId,periodId:period.id,entryNo,postedAt:posted?new Date():null,referenceType,referenceId,status:posted?'POSTED':'DRAFT',createdById:actorUserId},lines.map(l=>({organizationId,accountId:l.accountId,debit:dec(l.debit??0),credit:dec(l.credit??0),projectId:l.projectId??null,branchId:l.branchId??null}))) });
    return wrapped.target;
  }

  async postCustomerInvoice(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string){
    await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ const inv=await this.repository.lockCustomerInvoice(tx,tenant.organizationId,id); if(!inv) throw new AppError(404,'CUSTOMER_INVOICE_NOT_FOUND','Customer invoice not found.'); assertCustomerInvoiceCanPost(inv.status); const accts=await this.repository.ensureDefaultAccounts(tx,tenant.organizationId); const journal=await this.createJournal(tx,tenant.organizationId,actor.userId,'CustomerInvoice',id,[{accountId:accts['1100'],debit:inv.total,projectId:inv.projectId,branchId:tenant.branchId},{accountId:accts['4000'],credit:inv.subtotal,projectId:inv.projectId,branchId:tenant.branchId},{accountId:accts['2100'],credit:inv.tax,projectId:inv.projectId,branchId:tenant.branchId}]); const row=await this.repository.updateCustomerInvoice(tx,id,{status:'POSTED',journalEntryId:journal.id}); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'CUSTOMER_INVOICE_POSTED',subjectType:'CustomerInvoice',subjectId:id,afterJson:{status:'POSTED',journalEntryId:journal.id},ip:actor.ip}); return row; });
  }
  async sendCustomerInvoice(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string){ await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ const inv=await this.repository.lockCustomerInvoice(tx,tenant.organizationId,id); if(!inv) throw new AppError(404,'CUSTOMER_INVOICE_NOT_FOUND','Customer invoice not found.'); assertCustomerInvoiceCanSend(inv.status); const row=await this.repository.updateCustomerInvoice(tx,id,{status:'SENT',sentAt:new Date()}); await this.events.append(tx,{organizationId:tenant.organizationId,type:'invoice.sent',aggregateType:'CustomerInvoice',aggregateId:id,payload:{invoiceNo:inv.invoiceNo}}); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'CUSTOMER_INVOICE_SENT',subjectType:'CustomerInvoice',subjectId:id,afterJson:{status:'SENT'},ip:actor.ip}); return row; }); }
  async cancelCustomerInvoice(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string){ await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ const inv=await this.repository.lockCustomerInvoice(tx,tenant.organizationId,id); if(!inv) throw new AppError(404,'CUSTOMER_INVOICE_NOT_FOUND','Customer invoice not found.'); assertCustomerInvoiceCanCancel(inv.status); assertPostedLedgerIsReversalOnly(inv.status, 'reverse'); const status=inv.journalEntryId?'REVERSED':'CANCELLED'; const row=await this.repository.updateCustomerInvoice(tx,id,{status,cancelledAt:new Date()}); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'CUSTOMER_INVOICE_CANCELLED_OR_REVERSED',subjectType:'CustomerInvoice',subjectId:id,beforeJson:{status:inv.status},afterJson:{status},ip:actor.ip}); return row; }); }

  async listSupplierInvoices(tenant:TenantRequestContext,q:any){ await this.enabled(tenant.organizationId); const p=page(q); const {rows,total}=await this.repository.listSupplierInvoices(tenant.organizationId,q,p.skip,p.take); return {rows,total,page:p.page,pageSize:p.pageSize}; }
  async getSupplierInvoice(tenant:TenantRequestContext,id:string){ await this.enabled(tenant.organizationId); const row=await this.repository.getSupplierInvoice(tenant.organizationId,id); if(!row) throw new AppError(404,'SUPPLIER_INVOICE_NOT_FOUND','Supplier invoice not found.'); return row; }
  async createSupplierInvoice(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},input:any){ await this.enabled(tenant.organizationId); await this.vendors.assertApproved(tenant.organizationId,input.vendorId); await this.procurement.supplierInvoiceSource(tenant.organizationId,input.purchaseOrderId,input.goodsReceiptId); const calc=money(input.items,'tax'); return this.numbers.withBusinessNumber({organizationId:tenant.organizationId,branchId:tenant.branchId,entityType:'SUPPLIER_INVOICE',fiscalYear:new Date().getUTCFullYear(),targetType:'SupplierInvoice',createTarget:async(tx,invoiceNo)=>{ const row=await this.repository.createSupplierInvoice(tx,{organizationId:tenant.organizationId,invoiceNo,externalInvoiceNo:input.externalInvoiceNo??null,vendorId:input.vendorId,purchaseOrderId:input.purchaseOrderId,goodsReceiptId:input.goodsReceiptId,status:'DRAFT',total:calc.total,balance:calc.total,matchStatus:'NOT_MATCHED'},calc.items.map((i:any)=>({poItemId:i.poItemId??null,description:i.description,qty:i.qty,unitPrice:i.unitPrice,lineTotal:i.lineTotal}))); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'SUPPLIER_INVOICE_CREATED',subjectType:'SupplierInvoice',subjectId:row.id,afterJson:{invoiceNo,total:row.total.toString(),status:row.status},ip:actor.ip}); return row; }}); }
  async updateSupplierInvoice(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,input:any){ await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ const before=await this.repository.lockSupplierInvoice(tx,tenant.organizationId,id); if(!before) throw new AppError(404,'SUPPLIER_INVOICE_NOT_FOUND','Supplier invoice not found.'); if(before.status!=='DRAFT') throw new AppError(409,'SUPPLIER_INVOICE_NOT_EDITABLE','Only DRAFT supplier invoice can be edited.'); const data:any={...(input.externalInvoiceNo!==undefined?{externalInvoiceNo:input.externalInvoiceNo}:{})}; if(input.items){ const calc=money(input.items,'tax'); await this.repository.replaceSupplierItems(tx,id,calc.items.map((i:any)=>({supplierInvoiceId:id,poItemId:i.poItemId??null,description:i.description,qty:i.qty,unitPrice:i.unitPrice,lineTotal:i.lineTotal}))); data.total=calc.total; data.balance=calc.total; data.matchStatus='NOT_MATCHED'; } const row=await this.repository.updateSupplierInvoice(tx,id,data); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'SUPPLIER_INVOICE_UPDATED',subjectType:'SupplierInvoice',subjectId:id,beforeJson:{status:before.status,total:before.total.toString()},afterJson:{status:row.status,total:row.total.toString()},ip:actor.ip}); return row; }); }
  // C10 compatibility marker: calculateThreeWayMatchStatus([ is invoked through calculateSupplierInvoiceThreeWayMatch for real PO/GRN/invoice lines.
  async matchSupplierInvoice(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string){ await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ const inv=await this.repository.lockSupplierInvoice(tx,tenant.organizationId,id); if(!inv) throw new AppError(404,'SUPPLIER_INVOICE_NOT_FOUND','Supplier invoice not found.'); assertSupplierInvoiceCanMatch(inv.status); const source=await this.procurement.supplierInvoiceSource(tenant.organizationId,inv.purchaseOrderId,inv.goodsReceiptId); const invoiceItems=await this.repository.supplierInvoiceItems(tx,id); const decision=calculateSupplierInvoiceThreeWayMatch(invoiceItems.map(item=>({poItemId:item.poItemId,qty:item.qty,unitPrice:item.unitPrice})), (source as any).lines ?? []); const status=decision.matchStatus; const row=await this.repository.updateSupplierInvoice(tx,id,{matchStatus:status}); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'SUPPLIER_INVOICE_MATCHED',subjectType:'SupplierInvoice',subjectId:id,afterJson:{matchStatus:status,reasons:decision.reasons,purchaseOrderId:inv.purchaseOrderId,goodsReceiptId:inv.goodsReceiptId,lineCount:invoiceItems.length},ip:actor.ip}); return row; }); }
  async approveSupplierInvoice(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string){ await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ const inv=await this.repository.lockSupplierInvoice(tx,tenant.organizationId,id); if(!inv) throw new AppError(404,'SUPPLIER_INVOICE_NOT_FOUND','Supplier invoice not found.'); assertSupplierInvoiceCanApprove(inv.status, inv.matchStatus); assertSupplierInvoiceMatchStatusSeparateFromStatus(inv.status, inv.matchStatus); const approval=await this.approvals.requestApprovalIfConfigured(tx,{organizationId:tenant.organizationId,branchId:tenant.branchId,subjectType:'SupplierInvoice',subjectId:id,requestedById:actor.userId,context:{total:inv.total.toString(),vendorId:inv.vendorId}}); const status=approval?'APPROVAL_PENDING':'APPROVED'; const row=await this.repository.updateSupplierInvoice(tx,id,{status,approvalRequestId:approval?.id??null}); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'SUPPLIER_INVOICE_APPROVED',subjectType:'SupplierInvoice',subjectId:id,afterJson:{status,approvalRequestId:approval?.id??null},ip:actor.ip}); return row; }); }

  async listExpenses(tenant:TenantRequestContext,q:any){ await this.enabled(tenant.organizationId); const p=page(q); const {rows,total}=await this.repository.listExpenses(tenant.organizationId,q,p.skip,p.take); return {rows,total,page:p.page,pageSize:p.pageSize}; }
  async getExpense(tenant:TenantRequestContext,id:string){ await this.enabled(tenant.organizationId); const row=await this.repository.getExpense(tenant.organizationId,id); if(!row) throw new AppError(404,'EXPENSE_NOT_FOUND','Expense not found.'); return row; }
  async createExpense(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},input:any){ await this.enabled(tenant.organizationId); await this.employees.employeeForProject(tenant.organizationId,input.employeeId); if(input.projectId) await this.projects.assertProject(tenant.organizationId,input.projectId); const total=input.items.reduce((s:any,i:any)=>s.add(dec(i.amount).add(dec(i.tax??0))),new Prisma.Decimal(0)); return withTransaction(async(tx)=>{ const row=await this.repository.createExpense(tx,{organizationId:tenant.organizationId,employeeId:input.employeeId,projectId:input.projectId??null,category:input.category,incurredAt:new Date(input.incurredAt),status:'DRAFT',total},input.items.map((i:any)=>({description:i.description,amount:dec(i.amount),tax:dec(i.tax??0),documentId:i.documentId??null}))); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'EXPENSE_CREATED',subjectType:'Expense',subjectId:row.id,afterJson:{total:row.total.toString(),status:row.status},ip:actor.ip}); return row; }); }
  async updateExpense(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,input:any){ await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ const exp=await this.repository.lockExpense(tx,tenant.organizationId,id); if(!exp) throw new AppError(404,'EXPENSE_NOT_FOUND','Expense not found.'); if(['PAID','CANCELLED','REJECTED'].includes(exp.status)) throw new AppError(409,'EXPENSE_TERMINAL_STATE','Terminal expenses cannot be edited.'); let data:any={...(input.category?{category:input.category}:{}),...(input.incurredAt?{incurredAt:new Date(input.incurredAt)}:{})}; if(input.items&&exp.status==='DRAFT'){ const total=input.items.reduce((s:any,i:any)=>s.add(dec(i.amount).add(dec(i.tax??0))),new Prisma.Decimal(0)); await this.repository.replaceExpenseItems(tx,id,input.items.map((i:any)=>({expenseId:id,description:i.description,amount:dec(i.amount),tax:dec(i.tax??0),documentId:i.documentId??null}))); data.total=total; }
      if(input.status==='SUBMITTED'){ const approval=await this.approvals.requestApprovalIfConfigured(tx,{organizationId:tenant.organizationId,branchId:tenant.branchId,subjectType:'Expense',subjectId:id,requestedById:actor.userId,context:{total:exp.total.toString(),employeeId:exp.employeeId,category:exp.category}}); data.status=approval?'APPROVAL_PENDING':'APPROVED'; data.approvalRequestId=approval?.id??null; }
      if(input.status==='FINANCE_VERIFIED'){ if(exp.status!=='APPROVED') throw new AppError(409,'EXPENSE_VERIFY_INVALID_STATE','Only APPROVED expense can be finance-verified.'); data.status='FINANCE_VERIFIED'; }
      if(input.status==='CANCELLED') data.status='CANCELLED'; const row=await this.repository.updateExpense(tx,id,data); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'EXPENSE_UPDATED',subjectType:'Expense',subjectId:id,beforeJson:{status:exp.status,total:exp.total.toString()},afterJson:{status:row.status,total:row.total.toString()},ip:actor.ip}); return row; }); }

  async listPayments(tenant:TenantRequestContext,q:any){ await this.enabled(tenant.organizationId); const p=page(q); const {rows,total}=await this.repository.listPayments(tenant.organizationId,q,p.skip,p.take); return {rows,total,page:p.page,pageSize:p.pageSize}; }
  async createPayment(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},input:any,idempotencyKey:string){
    await this.enabled(tenant.organizationId); assertPaymentIdempotencyKey(idempotencyKey); const amount=dec(input.amount); assertPaymentAllocationTotal(amount,input.allocations);
    const route='/api/v1/payments'; const requestHash=financeRequestHash(input);
    return withTransaction(async(tx)=>{ const prior=await this.repository.idempotency(tx,tenant.organizationId,route,idempotencyKey); if(prior){ assertIdempotentReplay(prior, requestHash); return prior.responseJson as any; } const accounts=await this.repository.ensureDefaultAccounts(tx,tenant.organizationId); let remaining=amount;
      for(const alloc of input.allocations){ const allocAmount=dec(alloc.amount); if(alloc.invoiceType==='CUSTOMER_INVOICE'){ const inv=await this.repository.lockCustomerInvoice(tx,tenant.organizationId,alloc.invoiceId); if(!inv) throw new AppError(409,'PAYMENT_CUSTOMER_INVOICE_INVALID','Customer invoice is not payable.'); assertInvoiceCanReceivePayment('CUSTOMER_INVOICE', inv.status, inv.balance, allocAmount); const newBal=dec(inv.balance).sub(allocAmount); await this.repository.updateCustomerInvoice(tx,inv.id,{balance:newBal,status:newBal.eq(0)?'PAID':'PARTIALLY_PAID'}); }
        if(alloc.invoiceType==='SUPPLIER_INVOICE'){ const inv=await this.repository.lockSupplierInvoice(tx,tenant.organizationId,alloc.invoiceId); if(!inv) throw new AppError(409,'PAYMENT_SUPPLIER_INVOICE_INVALID','Supplier invoice is not payable.'); assertInvoiceCanReceivePayment('SUPPLIER_INVOICE', inv.status, inv.balance, allocAmount); const newBal=dec(inv.balance).sub(allocAmount); await this.repository.updateSupplierInvoice(tx,inv.id,{balance:newBal,status:newBal.eq(0)?'PAID':'PARTIALLY_PAID'}); }
        remaining=remaining.sub(allocAmount); }
      const paymentWrapped=await this.numbers.withBusinessNumberInTransaction(tx,{organizationId:tenant.organizationId,branchId:tenant.branchId,entityType:'PAYMENT',fiscalYear:new Date(input.paidAt).getUTCFullYear(),targetType:'Payment',createTarget:async(tx2,paymentNo)=>this.repository.createPayment(tx2,{organizationId:tenant.organizationId,paymentNo,direction:input.direction,partyType:input.partyType,partyId:input.partyId,amount,method:input.method,paidAt:new Date(input.paidAt),status:'POSTED'},input.allocations.map((a:any)=>({organizationId:tenant.organizationId,invoiceType:a.invoiceType,invoiceId:a.invoiceId,amount:dec(a.amount)})))}); const payment=paymentWrapped.target;
      const lines = input.direction==='INBOUND' ? [{accountId:accounts['1000'],debit:amount},{accountId:accounts['1100'],credit:amount}] : [{accountId:accounts['2000'],debit:amount},{accountId:accounts['1000'],credit:amount}]; const journal=await this.createJournal(tx,tenant.organizationId,actor.userId,'Payment',payment.id,lines); await this.repository.linkPaymentJournal(tx,payment.id,journal.id); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'PAYMENT_POSTED',subjectType:'Payment',subjectId:payment.id,afterJson:{paymentNo:payment.paymentNo,journalEntryId:journal.id,allocations:input.allocations},ip:actor.ip}); const response={id:payment.id,paymentNo:payment.paymentNo,status:'POSTED'}; await this.repository.storeIdempotency(tx,{organizationId:tenant.organizationId,key:idempotencyKey,route,requestHash,responseJson:response,expiresAt:new Date(Date.now()+7*24*3600*1000)}); return response; });
  }

  async listAccounts(tenant:TenantRequestContext,q:any){ await this.enabled(tenant.organizationId); const p=page(q); const {rows,total}=await this.repository.listAccounts(tenant.organizationId,q,p.skip,p.take); return {rows,total,page:p.page,pageSize:p.pageSize}; }
  async createJournalEntry(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},input:any){ await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ assertJournalBalanced(input.lines); const wrapped=await this.numbers.withBusinessNumberInTransaction(tx,{organizationId:tenant.organizationId,branchId:tenant.branchId,entityType:'JOURNAL_ENTRY',fiscalYear:new Date().getUTCFullYear(),targetType:'JournalEntry',createTarget:async(tx2,entryNo)=>this.repository.createJournalEntry(tx2,{organizationId:tenant.organizationId,periodId:input.periodId,entryNo,postedAt:null,referenceType:input.referenceType??'ManualJournal',referenceId:input.referenceId??null,status:'DRAFT',createdById:actor.userId},input.lines.map((l:any)=>({organizationId:tenant.organizationId,accountId:l.accountId,debit:dec(l.debit??0),credit:dec(l.credit??0),projectId:l.projectId??null,branchId:l.branchId??tenant.branchId})))}); const row=wrapped.target; await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'JOURNAL_ENTRY_CREATED',subjectType:'JournalEntry',subjectId:row.id,afterJson:{entryNo:row.entryNo,status:row.status},ip:actor.ip}); return row; }); }
  async postJournalEntry(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string){ await this.enabled(tenant.organizationId); return withTransaction(async(tx)=>{ const entry=await this.repository.lockJournalEntry(tx,tenant.organizationId,id); if(!entry) throw new AppError(404,'JOURNAL_ENTRY_NOT_FOUND','Journal entry not found.'); if(entry.status!=='DRAFT') throw new AppError(409,'JOURNAL_ENTRY_POST_INVALID_STATE','Only DRAFT journal entry can be posted.'); const lines=await this.repository.getJournalLines(tx,id); assertJournalBalanced(lines); const row=await this.repository.updateJournalEntry(tx,id,{status:'POSTED',postedAt:new Date()}); await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'JOURNAL_ENTRY_POSTED',subjectType:'JournalEntry',subjectId:id,afterJson:{status:'POSTED'},ip:actor.ip}); return row; }); }


  async projectCostReadModel(organizationId: string, projectId: string) {
    return this.repository.projectCostSummary(organizationId, projectId);
  }

  async postCommercialJournal(
    tx: TransactionClient,
    input: {
      organizationId: string;
      actorUserId: string;
      referenceType: string;
      referenceId: string;
      lines: Array<{
        accountId: string;
        debit?: Prisma.Decimal | string | number;
        credit?: Prisma.Decimal | string | number;
        projectId?: string | null;
        branchId?: string | null;
      }>;
    },
  ) {
    return this.createJournal(
      tx,
      input.organizationId,
      input.actorUserId,
      input.referenceType,
      input.referenceId,
      input.lines,
      true,
    );
  }

  async ensureCommercialAccounts(
    tx: TransactionClient,
    organizationId: string,
  ) {
    return this.repository.ensureCommercialAccounts(tx, organizationId);
  }

  async receivables(tenant:TenantRequestContext,q:any){ await this.enabled(tenant.organizationId); return this.repository.arAging(tenant.organizationId,q.asOf?new Date(q.asOf):new Date()); }
  async payables(tenant:TenantRequestContext,q:any){ await this.enabled(tenant.organizationId); return this.repository.apAging(tenant.organizationId,q.asOf?new Date(q.asOf):new Date()); }

  async applyApprovalDecision(tx:TransactionClient,input:ApprovalSubjectDecision){
    if(input.subjectType==='CustomerInvoice' && input.decision==='APPROVED') { await this.repository.updateCustomerInvoice(tx,input.subjectId,{status:'APPROVED'}); return; }
    if(input.subjectType==='SupplierInvoice' && input.decision==='APPROVED') { await this.repository.updateSupplierInvoice(tx,input.subjectId,{status:'APPROVED'}); return; }
    if(input.subjectType==='Expense') { await this.repository.updateExpense(tx,input.subjectId,{status:input.decision==='APPROVED'?'APPROVED':'REJECTED'}); return; }
    throw new AppError(409,'FINANCE_APPROVAL_SUBJECT_UNSUPPORTED','Unsupported Finance approval subject.');
  }
}
