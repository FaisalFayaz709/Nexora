import { createHash } from 'node:crypto';
import { Prisma, withTransaction, type TransactionClient } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { VendorGovernanceFacade } from '../vendors/index.js';
import type { EmployeeFacade } from '../hr/index.js';
import type { ApprovalFacade, ApprovalSubjectDecision } from '../approvals/index.js';
import { ProcurementRepository } from './procurement.repository.js';
import {
  assertPurchaseOrderSourceChain,
  assertQuotationCoversPurchaseRequest,
  assertSingleSelectedSupplierQuotation,
} from './procurement-completion-policy.js';
import {
  assertRfqCanAcceptQuotation,
  assertRfqCanClose,
  assertRfqCanInviteVendors,
  assertRfqCanPublish,
  assertSupplierQuotationCanBeSelected,
  assertVendorWasInvited,
  compareSupplierQuotations,
  normalizeInvitedVendorIds,
} from './procurement-workflow-policy.js';

const PAGE_SIZE=25; const MAX_PAGE_SIZE=100;
const page=(q:any)=>({page:q.page??1,pageSize:Math.min(q.pageSize??PAGE_SIZE,MAX_PAGE_SIZE)});
const isoDate=(d:Date)=>d.toISOString().slice(0,10);
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

export class ProcurementService {
  // MAKER_CHECKER_VIOLATION is enforced centrally by the Pass 8 Approval Engine before ProcurementFacade applies a final decision.
  constructor(
    private readonly numbers:NumberSequenceFacade,
    private readonly inventory:InventoryFacade,
    private readonly vendors:VendorGovernanceFacade,
    private readonly employees:EmployeeFacade,
    private readonly access:PlatformAccessFacade,
    private readonly approvals:ApprovalFacade,
    private readonly repo=new ProcurementRepository(),
    private readonly audit=new AuditWriter(),
    private readonly events=new BusinessEventWriter(),
  ){}

  private async actor(tenant:TenantRequestContext,userId:string){return this.employees.employeeForUser(tenant.organizationId,userId);}
  private branch(tenant:TenantRequestContext){if(!tenant.branchId)throw new AppError(400,'PROCUREMENT_BRANCH_CONTEXT_REQUIRED','A branch-scoped tenant context is required for procurement commands.');return tenant.branchId;}
  private async product(org:string,id:string){return this.inventory.getProductForProcurement(org,id);}
  private async warehouse(tenant:TenantRequestContext,id:string){const w=await this.inventory.getWarehouseForProcurement(tenant.organizationId,id);if(tenant.branchId&&w.branchId!==tenant.branchId)throw new AppError(403,'PROCUREMENT_BRANCH_SCOPE_DENIED','Warehouse is outside the active branch scope.');return w;}

  async listPr(tenant:TenantRequestContext,q:any){const p=page(q);const [rows,total]=await this.repo.listPurchaseRequests({organizationId:tenant.organizationId,branchId:tenant.branchId,skip:(p.page-1)*p.pageSize,take:p.pageSize});return {...p,total,rows};}
  async getPr(tenant:TenantRequestContext,id:string){const r=await this.repo.getPurchaseRequest(tenant.organizationId,tenant.branchId,id);if(!r)throw new AppError(404,'PURCHASE_REQUEST_NOT_FOUND','Purchase request not found.');return r;}
  async createPr(tenant:TenantRequestContext,userId:string,input:any){const branchId=this.branch(tenant);const emp=await this.actor(tenant,userId);if(emp.branchId!==branchId)throw new AppError(403,'PROCUREMENT_BRANCH_SCOPE_DENIED','Requester employee is outside the active branch scope.');for(const i of input.items)await this.product(tenant.organizationId,i.productId);
    const result=await this.numbers.withBusinessNumber({organizationId:tenant.organizationId,branchId,entityType:'PURCHASE_REQUEST',fiscalYear:new Date().getUTCFullYear(),targetType:'PurchaseRequest',createTarget:async(tx,prNo)=>{const items=input.items.map((i:any)=>({productId:i.productId,qty:new Prisma.Decimal(i.quantity),estimatedPrice:new Prisma.Decimal(i.quantity).mul(new Prisma.Decimal(i.estimatedUnitPrice))}));const row=await this.repo.createPurchaseRequest(tx,{organizationId:tenant.organizationId,branchId,projectId:input.projectId,prNo,requesterId:emp.id,requiredDate:new Date(`${input.requiredDate}T00:00:00Z`),reason:input.reason,status:'DRAFT',items:{create:items}});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'PURCHASE_REQUEST_CREATED',subjectType:'PurchaseRequest',subjectId:row.id,afterJson:{prNo,status:row.status},ip:null});return row;}});return result.target;}
  async updatePr(tenant:TenantRequestContext,userId:string,id:string,input:any){const before=await this.getPr(tenant,id);if(before.status!=='DRAFT')throw new AppError(409,'PURCHASE_REQUEST_NOT_EDITABLE','Only DRAFT purchase requests can be edited.');if(input.items)for(const i of input.items)await this.product(tenant.organizationId,i.productId);return withTransaction(async tx=>{const repo=this.repo.withDb(tx);let row=await repo.updatePurchaseRequest(tx,id,{...(input.requiredDate?{requiredDate:new Date(`${input.requiredDate}T00:00:00Z`)}:{}),...(input.reason?{reason:input.reason}:{})});if(input.items)row=await repo.replacePurchaseRequestItems(tx,id,input.items.map((i:any)=>({productId:i.productId,qty:new Prisma.Decimal(i.quantity),estimatedPrice:new Prisma.Decimal(i.quantity).mul(new Prisma.Decimal(i.estimatedUnitPrice))})));await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'PURCHASE_REQUEST_UPDATED',subjectType:'PurchaseRequest',subjectId:id,beforeJson:{status:before.status},afterJson:{status:row.status},ip:null});return row;});}
  async submitPr(tenant:TenantRequestContext,userId:string,id:string){
    const row=await this.getPr(tenant,id);
    if(row.status!=='DRAFT')throw new AppError(409,'PURCHASE_REQUEST_INVALID_STATE','Only DRAFT requests can be submitted.');
    const requestedById=await this.employees.userIdForEmployee(tenant.organizationId,row.requesterId);
    const amount=row.items.reduce((sum,item)=>sum.add(item.estimatedPrice),new Prisma.Decimal(0));
    return withTransaction(async tx=>{
      await this.repo.setPurchaseRequestStatus(tx,id,'SUBMITTED',{submittedAt:new Date()});
      const approval=await this.approvals.requestApproval(tx,{
        organizationId:tenant.organizationId,
        branchId:row.branchId,
        subjectType:'PurchaseRequest',
        subjectId:id,
        requestedById,
        context:{amount:amount.toString(),branchId:row.branchId,projectId:row.projectId},
      });
      const updated=await this.repo.setPurchaseRequestStatus(tx,id,'UNDER_REVIEW',{approvalRequestId:approval.id});
      await this.events.append(tx,{organizationId:tenant.organizationId,type:'purchase_request.submitted',aggregateType:'PurchaseRequest',aggregateId:id,payload:{prNo:updated.prNo,approvalRequestId:approval.id}});
      await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'PURCHASE_REQUEST_SUBMITTED',subjectType:'PurchaseRequest',subjectId:id,afterJson:{status:'UNDER_REVIEW',approvalRequestId:approval.id},ip:null});
      return updated;
    });
  }

  async decidePr(tenant:TenantRequestContext,userId:string,id:string,approve:boolean,comment:string){
    const row=await this.getPr(tenant,id);
    if(row.status!=='UNDER_REVIEW')throw new AppError(409,'PURCHASE_REQUEST_INVALID_STATE','Purchase request is not awaiting approval.');
    await this.approvals.actBySubject(
      tenant,
      userId,
      'PurchaseRequest',
      id,
      approve?'APPROVE':'REJECT',
      comment??null,
    );
    return this.getPr(tenant,id);
  }

  async createRfqFromPr(tenant:TenantRequestContext,userId:string,prId:string,input:{closesAt:string}){const pr=await this.getPr(tenant,prId);if(pr.status!=='APPROVED')throw new AppError(409,'RFQ_PURCHASE_REQUEST_NOT_APPROVED','RFQ requires an APPROVED purchase request.');const branchId=pr.branchId;const result=await this.numbers.withBusinessNumber({organizationId:tenant.organizationId,branchId,entityType:'RFQ',fiscalYear:new Date().getUTCFullYear(),targetType:'RFQ',createTarget:async(tx,rfqNo)=>{const rfq=await this.repo.createRfq(tx,{organizationId:tenant.organizationId,purchaseRequestId:pr.id,rfqNo,closesAt:new Date(input.closesAt),status:'DRAFT'});await this.repo.setPurchaseRequestStatus(tx,pr.id,'CONVERTED_TO_RFQ');await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'RFQ_CREATED',subjectType:'RFQ',subjectId:rfq.id,afterJson:{rfqNo,purchaseRequestId:pr.id},ip:null});return rfq;}});return result.target;}
  createRfq(tenant:TenantRequestContext,userId:string,input:any){return this.createRfqFromPr(tenant,userId,input.purchaseRequestId,{closesAt:input.closesAt});}
  async listRfqs(tenant:TenantRequestContext,q:any){const p=page(q);const [rows,total]=await this.repo.listRfqs({organizationId:tenant.organizationId,skip:(p.page-1)*p.pageSize,take:p.pageSize});return {...p,total,rows};}
  async inviteVendors(tenant:TenantRequestContext,userId:string,id:string,vendorIds:string[]){const rfq=await this.repo.getRfq(tenant.organizationId,id);if(!rfq)throw new AppError(404,'RFQ_NOT_FOUND','RFQ not found.');assertRfqCanInviteVendors(rfq.status as never);const normalizedVendorIds=normalizeInvitedVendorIds(vendorIds);for(const v of normalizedVendorIds)await this.vendors.assertApproved(tenant.organizationId,v);return withTransaction(async tx=>{await this.repo.inviteVendors(tx,id,normalizedVendorIds);await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'RFQ_VENDORS_INVITED',subjectType:'RFQ',subjectId:id,afterJson:{vendorIds:normalizedVendorIds},ip:null});return this.repo.withDb(tx).getRfq(tenant.organizationId,id);});}
  async publishRfq(tenant:TenantRequestContext,userId:string,id:string){const r=await this.repo.getRfq(tenant.organizationId,id);if(!r)throw new AppError(404,'RFQ_NOT_FOUND','RFQ not found.');assertRfqCanPublish(r.status as never,r.vendors.length);return withTransaction(async tx=>{const u=await this.repo.setRfqStatus(tx,id,'PUBLISHED',{publishedAt:new Date()});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'RFQ_PUBLISHED',subjectType:'RFQ',subjectId:id,afterJson:{status:u.status},ip:null});return u;});}
  async closeRfq(tenant:TenantRequestContext,userId:string,id:string){const r=await this.repo.getRfq(tenant.organizationId,id);if(!r)throw new AppError(404,'RFQ_NOT_FOUND','RFQ not found.');assertRfqCanClose(r.status as never);return withTransaction(async tx=>{const u=await this.repo.setRfqStatus(tx,id,'CLOSED',{closedAt:new Date()});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'RFQ_CLOSED',subjectType:'RFQ',subjectId:id,afterJson:{status:u.status},ip:null});return u;});}
  async comparison(tenant:TenantRequestContext,id:string){const rfq=await this.repo.getRfq(tenant.organizationId,id);if(!rfq)throw new AppError(404,'RFQ_NOT_FOUND','RFQ not found.');const quotes=await this.repo.quotationComparison(tenant.organizationId,id);const ranked=compareSupplierQuotations(quotes.map(q=>({id:q.id,vendorId:q.vendorId,quoteRef:q.quoteRef,total:q.total,deliveryDays:q.items.map(i=>i.deliveryDays),warrantyMonths:q.items.map(i=>i.warrantyMonths),status:q.status as never})));return ranked.map(row=>{const quote=quotes.find(q=>q.id===row.id);return {id:row.id,vendorId:row.vendorId,quoteRef:row.quoteRef,total:row.total.toString(),validity:quote?isoDate(quote.validity):null,status:quote?.status??'UNKNOWN',rank:row.rank,averageDeliveryDays:row.averageDeliveryDays,maxWarrantyMonths:row.maxWarrantyMonths,isLowestCost:row.isLowestCost,isFastestDelivery:row.isFastestDelivery,isStrongestWarranty:row.isStrongestWarranty};});}

  async createQuotation(tenant:TenantRequestContext,userId:string,input:any){const rfq=await this.repo.getRfq(tenant.organizationId,input.rfqId);if(!rfq)throw new AppError(404,'RFQ_NOT_FOUND','RFQ not found.');assertRfqCanAcceptQuotation(rfq.status as never);assertVendorWasInvited(rfq.vendors.map(v=>v.vendorId),input.vendorId);await this.vendors.assertApproved(tenant.organizationId,input.vendorId);for(const i of input.items)await this.product(tenant.organizationId,i.productId);assertQuotationCoversPurchaseRequest({purchaseRequestId:rfq.purchaseRequestId,rfqId:rfq.id,requestItems:rfq.purchaseRequest.items.map(i=>({productId:i.productId,qty:i.qty})),quotationItems:input.items.map((i:any)=>({productId:i.productId,quantity:i.quantity}))});const total=input.items.reduce((s:any,i:any)=>s.add(new Prisma.Decimal(i.quantity).mul(new Prisma.Decimal(i.unitPrice))),new Prisma.Decimal(0));return withTransaction(async tx=>{const q=await this.repo.createQuotation(tx,{organizationId:tenant.organizationId,rfqId:input.rfqId,vendorId:input.vendorId,quoteRef:input.quoteRef,validity:new Date(`${input.validity}T00:00:00Z`),paymentTerms:input.paymentTerms??null,total,status:'SUBMITTED',items:{create:input.items.map((i:any)=>({productId:i.productId,qty:new Prisma.Decimal(i.quantity),unitPrice:new Prisma.Decimal(i.unitPrice),deliveryDays:i.deliveryDays,warrantyMonths:i.warrantyMonths}))}});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'SUPPLIER_QUOTATION_RECORDED',subjectType:'SupplierQuotation',subjectId:q.id,afterJson:{rfqId:q.rfqId,vendorId:q.vendorId,total:q.total.toString(),coverage:'RFQ_PURCHASE_REQUEST_ITEMS_MATCHED'},ip:null});return q;});}
  async selectQuotation(tenant:TenantRequestContext,userId:string,id:string,comment?:string){const q=await this.repo.getQuotation(tenant.organizationId,id);if(!q)throw new AppError(404,'SUPPLIER_QUOTATION_NOT_FOUND','Supplier quotation not found.');assertSupplierQuotationCanBeSelected(q.status as never);assertSingleSelectedSupplierQuotation({rfqId:q.rfqId,selectedQuotationCount:await this.repo.countSelectedQuotations(tenant.organizationId,q.rfqId,id)});await this.vendors.assertApproved(tenant.organizationId,q.vendorId);return withTransaction(async tx=>{const selected=await this.repo.selectQuotation(tx,id);await this.repo.rejectOtherQuotations(tx,q.rfqId,id);await this.repo.setRfqStatus(tx,q.rfqId,'AWARDED');await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'SUPPLIER_QUOTATION_SELECTED',subjectType:'SupplierQuotation',subjectId:id,afterJson:{status:'SELECTED',comment:comment??null},ip:null});return selected;});}

  async listPos(tenant:TenantRequestContext,q:any){const p=page(q);const [rows,total]=await this.repo.listPurchaseOrders({organizationId:tenant.organizationId,branchId:tenant.branchId,skip:(p.page-1)*p.pageSize,take:p.pageSize});return {...p,total,rows};}
  async createPo(tenant:TenantRequestContext,userId:string,input:any){const quote=await this.repo.getQuotation(tenant.organizationId,input.supplierQuotationId);if(!quote)throw new AppError(404,'SUPPLIER_QUOTATION_NOT_FOUND','Supplier quotation not found.');await this.vendors.assertApproved(tenant.organizationId,quote.vendorId);const emp=await this.actor(tenant,userId);const pr=await this.repo.getPurchaseRequest(tenant.organizationId,null,quote.rfq.purchaseRequestId);if(!pr)throw new AppError(409,'PURCHASE_ORDER_SOURCE_INVALID','Source purchase request not found.');const branchId=pr.branchId;assertPurchaseOrderSourceChain({supplierQuotationId:quote.id,quoteStatus:quote.status,rfqPurchaseRequestId:quote.rfq.purchaseRequestId,purchaseRequestId:pr.id,purchaseRequestStatus:pr.status,purchaseRequestBranchId:branchId,activeBranchId:tenant.branchId});const result=await this.numbers.withBusinessNumber({organizationId:tenant.organizationId,branchId,entityType:'PURCHASE_ORDER',fiscalYear:new Date().getUTCFullYear(),targetType:'PurchaseOrder',createTarget:async(tx,poNo)=>{const po=await this.repo.createPurchaseOrder(tx,{organizationId:tenant.organizationId,branchId,vendorId:quote.vendorId,supplierQuotationId:quote.id,poNo,orderDate:new Date(),expectedDate:new Date(`${input.expectedDate}T00:00:00Z`),status:'DRAFT',total:quote.total,requesterId:emp.id,items:{create:quote.items.map(i=>({productId:i.productId,orderedQty:i.qty,unitPrice:i.unitPrice,tax:new Prisma.Decimal(0)}))}});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'PURCHASE_ORDER_CREATED',subjectType:'PurchaseOrder',subjectId:po.id,afterJson:{poNo,status:po.status,total:po.total.toString(),sourceChain:'SELECTED_QUOTATION_RFQ_PURCHASE_REQUEST'},ip:null});return po;}});return result.target;}
  async poCommand(tenant:TenantRequestContext,userId:string,id:string,action:'submit'|'approve'|'send'|'cancel',comment?:string){
    const po=await this.repo.getPurchaseOrder(tenant.organizationId,tenant.branchId,id);
    if(!po)throw new AppError(404,'PURCHASE_ORDER_NOT_FOUND','Purchase order not found.');

    if(action==='submit'){
      if(po.status!=='DRAFT')throw new AppError(409,'PURCHASE_ORDER_INVALID_STATE','Only DRAFT PO can be submitted.');
      const requestedById=await this.employees.userIdForEmployee(tenant.organizationId,po.requesterId);
      return withTransaction(async tx=>{
        const pending=await this.repo.setPurchaseOrderStatus(tx,id,'APPROVAL_PENDING',{submittedAt:new Date()});
        const approval=await this.approvals.requestApproval(tx,{
          organizationId:tenant.organizationId,
          branchId:po.branchId,
          subjectType:'PurchaseOrder',
          subjectId:id,
          requestedById,
          context:{amount:po.total.toString(),branchId:po.branchId,vendorId:po.vendorId},
        });
        await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'PURCHASE_ORDER_SUBMITTED',subjectType:'PurchaseOrder',subjectId:id,afterJson:{status:'APPROVAL_PENDING',approvalRequestId:approval.id},ip:null});
        return pending;
      });
    }

    if(action==='approve'){
      if(po.status!=='APPROVAL_PENDING')throw new AppError(409,'PURCHASE_ORDER_INVALID_STATE','PO is not awaiting approval.');
      await this.approvals.actBySubject(tenant,userId,'PurchaseOrder',id,'APPROVE',comment??null);
      const updated=await this.repo.getPurchaseOrder(tenant.organizationId,tenant.branchId,id);
      if(!updated)throw new AppError(404,'PURCHASE_ORDER_NOT_FOUND','Purchase order not found.');
      return updated;
    }

    if(action==='send'&&po.status!=='APPROVED')throw new AppError(409,'PURCHASE_ORDER_INVALID_STATE','Only APPROVED PO can be sent.');
    if(action==='cancel'&&(['RECEIVED','CLOSED','CANCELLED'].includes(po.status)||(await this.repo.countReceipts(tenant.organizationId,id))>0)){
      throw new AppError(409,'PURCHASE_ORDER_CANNOT_CANCEL','PO with receipt history cannot be cancelled.');
    }

    return withTransaction(async tx=>{
      const map={
        send:['SENT',{sentAt:new Date()}],
        cancel:['CANCELLED',{cancelledAt:new Date(),cancellationReason:comment??'Cancelled'}],
      } as const;
      const [status,data]=map[action as 'send'|'cancel'];
      const updated=await this.repo.setPurchaseOrderStatus(tx,id,status,data);
      await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:`PURCHASE_ORDER_${action.toUpperCase()}`,subjectType:'PurchaseOrder',subjectId:id,afterJson:{status,comment:comment??null},ip:null});
      return updated;
    });
  }


  async createProjectMaterialRequirement(
    tx: TransactionClient,
    input: {
      organizationId: string;
      projectId: string;
      requestedById: string;
      items: Array<{ productId: string; qty: Prisma.Decimal }>;
    },
  ) {
    if (!input.items.length) {
      throw new AppError(
        409,
        'MATERIAL_REQUIREMENT_EMPTY',
        'Material requirement must contain at least one shortage line.',
      );
    }
    const row = await this.repo.createMaterialRequirement(tx, input);
    await this.audit.append(tx, {
      organizationId: input.organizationId,
      actorUserId: null,
      action: 'MATERIAL_REQUIREMENT_CREATED',
      subjectType: 'MaterialRequirement',
      subjectId: row.id,
      afterJson: {
        projectId: input.projectId,
        requestedById: input.requestedById,
        itemCount: row.items.length,
        status: row.status,
      },
      ip: null,
    });
    return row;
  }

  async projectProcurementReadModel(organizationId: string, projectId: string) {
    const data = await this.repo.projectProcurementSummary(organizationId, projectId);
    const zero = new Prisma.Decimal(0);

    const committed = data.purchaseOrders.reduce(
      (sum, po) => sum.add(po.total),
      zero,
    );

    const receivedMaterial = data.purchaseOrders.reduce((sum, po) => {
      return po.items.reduce((poSum, item) => {
        const accepted = item.receiptItems.reduce(
          (qty, receipt) => qty.add(receipt.acceptedQty),
          new Prisma.Decimal(0),
        );
        return poSum.add(accepted.mul(item.unitPrice));
      }, sum);
    }, zero);

    const timeline = [
      ...data.requirements.map((row) => ({
        occurredAt: row.createdAt,
        type: 'MATERIAL_REQUIREMENT_CREATED',
        referenceType: 'MaterialRequirement',
        referenceId: row.id,
        status: row.status,
      })),
      ...data.purchaseRequests.map((row) => ({
        occurredAt: row.createdAt,
        type: 'PURCHASE_REQUEST_CREATED',
        referenceType: 'PurchaseRequest',
        referenceId: row.id,
        referenceNo: row.prNo,
        status: row.status,
      })),
      ...data.purchaseOrders.map((row) => ({
        occurredAt: row.createdAt,
        type: 'PURCHASE_ORDER_CREATED',
        referenceType: 'PurchaseOrder',
        referenceId: row.id,
        referenceNo: row.poNo,
        status: row.status,
      })),
    ];

    return {
      committed,
      receivedMaterial,
      timeline,
    };
  }

  async applyApprovalDecision(tx:TransactionClient,input:ApprovalSubjectDecision):Promise<void>{
    if(input.subjectType==='PurchaseRequest'){
      const row=await this.repo.lockPurchaseRequest(tx,input.organizationId,input.subjectId);
      if(!row)throw new AppError(404,'PURCHASE_REQUEST_NOT_FOUND','Purchase request not found.');
      if(row.status!=='UNDER_REVIEW')throw new AppError(409,'PURCHASE_REQUEST_INVALID_STATE','Purchase request is not awaiting approval.');

      const status=input.decision==='APPROVED'
        ?'APPROVED'
        :input.decision==='REJECTED'
          ?'REJECTED'
          :'DRAFT';

      const updated=await this.repo.setPurchaseRequestStatus(tx,row.id,status,{
        ...(status==='APPROVED'?{approvedAt:new Date()}:{}),
        ...(status==='REJECTED'?{rejectedAt:new Date()}:{}),
      });

      if(status==='APPROVED'){
        await this.events.append(tx,{organizationId:input.organizationId,type:'purchase_request.approved',aggregateType:'PurchaseRequest',aggregateId:row.id,payload:{prNo:updated.prNo,approvalRequestId:input.approvalRequestId}});
      }
      await this.audit.append(tx,{organizationId:input.organizationId,actorUserId:input.actorUserId,action:`PURCHASE_REQUEST_APPROVAL_${input.decision}`,subjectType:'PurchaseRequest',subjectId:row.id,afterJson:{status,approvalRequestId:input.approvalRequestId,comment:input.comment},ip:null});
      return;
    }

    if(input.subjectType==='PurchaseOrder'){
      const row=await this.repo.lockPurchaseOrder(tx,input.organizationId,input.subjectId);
      if(!row)throw new AppError(404,'PURCHASE_ORDER_NOT_FOUND','Purchase order not found.');
      if(row.status!=='APPROVAL_PENDING')throw new AppError(409,'PURCHASE_ORDER_INVALID_STATE','Purchase order is not awaiting approval.');

      const status=input.decision==='APPROVED'?'APPROVED':'DRAFT';
      const approver=input.decision==='APPROVED'
        ?await this.employees.employeeForUser(input.organizationId,input.actorUserId)
        :null;

      const updated=await this.repo.setPurchaseOrderStatus(tx,row.id,status,{
        ...(status==='APPROVED'?{approvedAt:new Date(),approvedById:approver?.id}:{}),
      });

      if(status==='APPROVED'){
        await this.events.append(tx,{organizationId:input.organizationId,type:'purchase_order.approved',aggregateType:'PurchaseOrder',aggregateId:row.id,payload:{poNo:updated.poNo,approvalRequestId:input.approvalRequestId}});
      }
      await this.audit.append(tx,{organizationId:input.organizationId,actorUserId:input.actorUserId,action:`PURCHASE_ORDER_APPROVAL_${input.decision}`,subjectType:'PurchaseOrder',subjectId:row.id,afterJson:{status,approvalRequestId:input.approvalRequestId,comment:input.comment},ip:null});
      return;
    }

    throw new AppError(409,'PROCUREMENT_APPROVAL_SUBJECT_UNSUPPORTED','Unsupported procurement approval subject.',{subjectType:input.subjectType});
  }

  async listGrn(tenant:TenantRequestContext,q:any){const p=page(q);const [rows,total]=await this.repo.listGoodsReceipts({organizationId:tenant.organizationId,branchId:tenant.branchId,skip:(p.page-1)*p.pageSize,take:p.pageSize});return {...p,total,rows};}
  async getGrn(tenant:TenantRequestContext,id:string){const r=await this.repo.getGoodsReceipt(tenant.organizationId,tenant.branchId,id);if(!r)throw new AppError(404,'GOODS_RECEIPT_NOT_FOUND','Goods receipt not found.');return r;}
  async receiveWithNumber(tenant:TenantRequestContext,userId:string,input:any,idempotencyKey:string){if(!idempotencyKey)throw new AppError(400,'IDEMPOTENCY_KEY_REQUIRED','Idempotency-Key is required for goods receipt.');const po=await this.repo.getPurchaseOrder(tenant.organizationId,tenant.branchId,input.purchaseOrderId);if(!po)throw new AppError(404,'PURCHASE_ORDER_NOT_FOUND','Purchase order not found.');if(!['APPROVED','SENT','PARTIALLY_RECEIVED'].includes(po.status))throw new AppError(409,'PURCHASE_ORDER_NOT_RECEIVABLE','Purchase order is not receivable.');const wh=await this.warehouse(tenant,input.warehouseId);if(wh.branchId!==po.branchId)throw new AppError(409,'GOODS_RECEIPT_WAREHOUSE_BRANCH_MISMATCH','Receiving warehouse must belong to the purchase-order branch.');const emp=await this.actor(tenant,userId);const tolerance=await this.access.receiptTolerancePct(tenant.organizationId);const requestHash=hash(input),route='/api/v1/goods-receipts';const existing=await this.repo.findIdempotency(tenant.organizationId,route,idempotencyKey);if(existing){if(existing.requestHash!==requestHash)throw new AppError(409,'IDEMPOTENCY_KEY_REUSED','Idempotency key was used with a different request.');if(existing.responseJson)return existing.responseJson as any;throw new AppError(409,'IDEMPOTENCY_REQUEST_IN_PROGRESS','The same goods-receipt request is already processing.');}
    try { const result=await this.numbers.withBusinessNumber({organizationId:tenant.organizationId,branchId:po.branchId,entityType:'GOODS_RECEIPT',fiscalYear:new Date(input.receivedAt).getUTCFullYear(),targetType:'GoodsReceipt',createTarget:async(tx,grnNo)=>{const claim=await this.repo.claimIdempotency(tx,{organizationId:tenant.organizationId,route,key:idempotencyKey,requestHash,expiresAt:new Date(Date.now()+7*24*3600*1000)});if(!claim.claimed){if(claim.requestHash!==requestHash)throw new AppError(409,'IDEMPOTENCY_KEY_REUSED','Idempotency key was used with a different request.');throw new AppError(409,'IDEMPOTENCY_REPLAY','Completed duplicate request detected.');}const lockedPo=await this.repo.lockPurchaseOrder(tx,tenant.organizationId,po.id);if(!lockedPo||!['APPROVED','SENT','PARTIALLY_RECEIVED'].includes(lockedPo.status))throw new AppError(409,'PURCHASE_ORDER_NOT_RECEIVABLE','Purchase order is no longer receivable.');const prepared:any[]=[];for(const line of input.items){const item=await this.repo.lockPurchaseOrderItem(tx,po.id,line.purchaseOrderItemId);if(!item)throw new AppError(400,'GOODS_RECEIPT_PO_ITEM_INVALID','PO item does not belong to this PO.');const received=new Prisma.Decimal(line.receivedQty),accepted=new Prisma.Decimal(line.acceptedQty),damaged=new Prisma.Decimal(line.damagedQty);if(!received.isPositive()||accepted.isNegative()||damaged.isNegative()||accepted.add(damaged).greaterThan(received))throw new AppError(400,'GOODS_RECEIPT_QUANTITY_INVALID','Invalid received/accepted/damaged quantities.');const max=item.orderedQty.mul(new Prisma.Decimal(1).add(new Prisma.Decimal(tolerance).div(100)));if(item.receivedQty.add(received).greaterThan(max))throw new AppError(409,'GOODS_RECEIPT_OVER_RECEIPT','Receipt exceeds PO quantity plus configured tolerance.');const product=await this.inventory.getProductForProcurement(tenant.organizationId,item.productId);if(product.trackingType==='SERIAL'&&line.serialNumbers.length!==accepted.toNumber())throw new AppError(400,'GOODS_RECEIPT_SERIAL_COUNT_MISMATCH','Accepted serialized quantity must equal serial count.');prepared.push({item,line,received,accepted,damaged});}
      const header=await this.repo.createGoodsReceipt(tx,{organizationId:tenant.organizationId,purchaseOrderId:po.id,warehouseId:input.warehouseId,grnNo,receivedAt:new Date(input.receivedAt),receivedById:emp.id,status:'INSPECTION_PENDING',items:{create:prepared.map(x=>({poItemId:x.item.id,productId:x.item.productId,receivedQty:x.received,acceptedQty:x.accepted,damagedQty:x.damaged,serialsJson:x.line.serialNumbers??[],batchesJson:x.line.batches??[]}))}});const stockTransactions:string[]=[];for(const x of prepared){await this.repo.incrementPoReceived(tx,x.item.id,x.received);if(x.accepted.isPositive()){const ledger=await this.inventory.receiveIntoWarehouse(tx,{organizationId:tenant.organizationId,warehouseId:input.warehouseId,productId:x.item.productId,qty:x.accepted,referenceType:'GoodsReceipt',referenceId:header.id,serialNumbers:x.line.serialNumbers??[],batches:(x.line.batches??[]).map((b:any)=>({lotNo:b.lotNo,qty:new Prisma.Decimal(b.quantity),manufactureDate:b.manufactureDate?new Date(`${b.manufactureDate}T00:00:00Z`):null,expiryDate:b.expiryDate?new Date(`${b.expiryDate}T00:00:00Z`):null})),unitCost:x.item.unitPrice});stockTransactions.push(ledger.id);}}
      const items=await this.repo.poItems(tx,po.id);const allReceived=items.every(i=>i.receivedQty.greaterThanOrEqualTo(i.orderedQty));await this.repo.setPurchaseOrderStatus(tx,po.id,allReceived?'RECEIVED':'PARTIALLY_RECEIVED');await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'GOODS_RECEIPT_RECEIVED',subjectType:'GoodsReceipt',subjectId:header.id,afterJson:{grnNo,purchaseOrderId:po.id,warehouseId:input.warehouseId,stockTransactions},ip:null});await this.events.append(tx,{organizationId:tenant.organizationId,type:'goods_receipt.received',aggregateType:'GoodsReceipt',aggregateId:header.id,payload:{grnNo,purchaseOrderId:po.id,warehouseId:input.warehouseId}});const response={id:header.id,grnNo,status:header.status,stockTransactions};await this.repo.completeIdempotency(tx,tenant.organizationId,route,idempotencyKey,response);return {...header,stockTransactions};}});return result.target;} catch(error){if(error instanceof AppError&&error.code==='IDEMPOTENCY_REPLAY'){const replay=await this.repo.findIdempotency(tenant.organizationId,route,idempotencyKey);if(replay?.responseJson)return replay.responseJson as any;}throw error;}}

  async inspect(tenant:TenantRequestContext,userId:string,id:string,input:any){const grn=await this.getGrn(tenant,id);if(!['RECEIVED','INSPECTION_PENDING'].includes(grn.status))throw new AppError(409,'GOODS_RECEIPT_INVALID_STATE','Goods receipt cannot be inspected in its current state.');const emp=await this.actor(tenant,userId);return withTransaction(async tx=>{const inspection=await this.repo.createInspection(tx,{organizationId:tenant.organizationId,goodsReceiptId:id,inspectorId:emp.id,result:input.result,notes:input.notes??null});const updated=await this.repo.setGoodsReceiptStatus(tx,id,input.result);await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'GOODS_RECEIPT_INSPECTED',subjectType:'GoodsReceipt',subjectId:id,afterJson:{result:input.result,inspectionId:inspection.id},ip:null});return updated;});}
}


// Pass M10 Finance public read model: used by Finance only through ProcurementFacade.
export async function supplierInvoiceSourceFromProcurement(organizationId: string, purchaseOrderId: string, goodsReceiptId: string) {
  const repository = new ProcurementRepository();
  const { purchaseOrder, goodsReceipt } = await repository.supplierInvoiceSourceSnapshot(organizationId, purchaseOrderId, goodsReceiptId);
  if (!goodsReceipt) throw new AppError(404, 'GOODS_RECEIPT_NOT_FOUND', 'Goods receipt not found for supplier invoice matching.');

  return {
    organizationId,
    purchaseOrderId,
    goodsReceiptId,
    vendorId: purchaseOrder.vendorId,
    purchaseOrderStatus: purchaseOrder.status,
    goodsReceiptStatus: goodsReceipt.status,
    matchable: true,
    lines: purchaseOrder.items.map((item) => {
      const receiptItems = goodsReceipt.items.filter((receiptItem) => receiptItem.poItemId === item.id);
      const receivedAcceptedQty = receiptItems.reduce((sum, receiptItem) => sum.add(receiptItem.acceptedQty), new Prisma.Decimal(0));
      const damagedQty = receiptItems.reduce((sum, receiptItem) => sum.add(receiptItem.damagedQty), new Prisma.Decimal(0));
      return {
        poItemId: item.id,
        productId: item.productId,
        orderedQty: item.orderedQty.toString(),
        receivedAcceptedQty: receivedAcceptedQty.toString(),
        damagedQty: damagedQty.toString(),
        poUnitPrice: item.unitPrice.toString(),
        poTax: item.tax.toString(),
      };
    }),
  };
}
