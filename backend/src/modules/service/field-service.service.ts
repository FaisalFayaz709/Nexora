import { Prisma, withTransaction, type TransactionClient } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { stableRequestHash } from '../../core/idempotency/request-hash.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { AssetFacade } from '../assets/index.js';
import type { CustomerFacade } from '../customers/index.js';
import type { EmployeeFacade } from '../hr/index.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { FieldServiceRepository } from './field-service.repository.js';
import {
  assertActiveVisitRequired,
  assertServicePartTracking,
  assertServiceReportAllowed,
  assertServiceReportTimeWindow,
  assertTicketAssetPlacement,
  assertTicketAssignable,
  assertTicketClosable,
  assertTicketResolvable,
  assertVisitCheckInAllowed,
  assertVisitCheckOutAllowed,
  assertVisitLocationPolicy,
  assertWorkOrderAssignable,
  assertWorkOrderCompletionAllowed,
  nextTechnicianCommandStatus,
  type WorkOrderState,
} from './field-service-workflow-policy.js';
import {
  assertAssignedTechnicianCommandScope,
  assertFieldServiceReportCompletionEvidence,
  assertSlaSnapshotCompleteness,
} from './field-service-completion-policy.js';
import {
  assertOfflineCommandFresh,
  assertOfflineTechnicianScope,
  offlineCommandIdempotencyKey,
  offlineCommandType,
  sortedOfflineCommands,
  type OfflineCommandEnvelope,
  type OfflineTechnicianCommandType,
} from './field-service-offline-sync.policy.js';

const ticketPatchTransitions: Record<string, readonly string[]> = {
  OPEN:['CANCELLED'], ASSIGNED:['IN_PROGRESS','WAITING_CUSTOMER','WAITING_VENDOR','CANCELLED'],
  IN_PROGRESS:['WAITING_CUSTOMER','WAITING_VENDOR','CANCELLED'],
  WAITING_CUSTOMER:['IN_PROGRESS','WAITING_VENDOR','CANCELLED'],
  WAITING_VENDOR:['IN_PROGRESS','WAITING_CUSTOMER','CANCELLED'], RESOLVED:[], CLOSED:[], CANCELLED:[],
};
function paging(q:{page?:number;pageSize?:number}){const page=q.page??1;const pageSize=Math.min(q.pageSize??25,100);return{page,pageSize,skip:(page-1)*pageSize,take:pageSize};}
function addMinutes(d:Date,m:number){return new Date(d.getTime()+m*60000);}
function remaining(d:Date){return Math.ceil((d.getTime()-Date.now())/60000);}
function slaSnapshot(row:any){const now=new Date();const rAt=row.firstRespondedAt??now;const xAt=row.resolvedAt??now;return{responseMinutes:row.slaPolicy.responseMinutes,resolutionMinutes:row.slaPolicy.resolutionMinutes,responseDueAt:row.responseDueAt.toISOString(),resolutionDueAt:row.resolutionDueAt.toISOString(),firstRespondedAt:row.firstRespondedAt?.toISOString()??null,resolvedAt:row.resolvedAt?.toISOString()??null,responseBreached:rAt>row.responseDueAt,resolutionBreached:xAt>row.resolutionDueAt,responseRemainingMinutes:remaining(row.responseDueAt),resolutionRemainingMinutes:remaining(row.resolutionDueAt)};}
function retentionDate(d:Date,days:number){return new Date(d.getTime()+days*86400000);}


const OFFLINE_SYNC_ROUTE = '/api/v1/portal/technician/offline-sync' as const;
const OFFLINE_SYNC_TTL_SECONDS = 7 * 24 * 60 * 60;
const OFFLINE_SYNC_MAX_HOURS = 72;

type OfflineSyncCommandStatus = 'ACCEPTED' | 'REPLAYED';
type OfflineSyncCommandResult = {
  readonly clientCommandId: string;
  readonly status: OfflineSyncCommandStatus;
  readonly result: unknown;
};

function payloadRecord(payload: Record<string, unknown> | undefined, key: string): Record<string, unknown> {
  const value = payload?.[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function payloadString(payload: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function payloadBoolean(payload: Record<string, unknown> | undefined, key: string, fallback = false): boolean {
  const value = payload?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

function payloadNumber(payload: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = payload?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function payloadStringArray(payload: Record<string, unknown> | undefined, key: string): string[] {
  const value = payload?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
}

function payloadAt(command: OfflineCommandEnvelope, key = 'capturedAt'): string {
  return payloadString(command.payload, key) ?? command.occurredAt;
}

function checkInPayload(command: OfflineCommandEnvelope) {
  const documents = [...payloadStringArray(command.payload, 'documentIds'), ...payloadStringArray(command.payload, 'evidenceDocumentIds')];
  return {
    capturedAt: payloadAt(command),
    latitude: payloadNumber(command.payload, 'latitude'),
    longitude: payloadNumber(command.payload, 'longitude'),
    accuracyMeters: payloadNumber(command.payload, 'accuracyMeters'),
    photoDocumentId: payloadString(command.payload, 'photoDocumentId') ?? documents[0],
  };
}

function locationPayload(command: OfflineCommandEnvelope) {
  return {
    capturedAt: payloadAt(command),
    latitude: payloadNumber(command.payload, 'latitude'),
    longitude: payloadNumber(command.payload, 'longitude'),
    accuracyMeters: payloadNumber(command.payload, 'accuracyMeters'),
  };
}

function checkOutPayload(command: OfflineCommandEnvelope) {
  const documents = [...payloadStringArray(command.payload, 'documentIds'), ...payloadStringArray(command.payload, 'evidenceDocumentIds')];
  return {
    capturedAt: payloadAt(command),
    latitude: payloadNumber(command.payload, 'latitude'),
    longitude: payloadNumber(command.payload, 'longitude'),
    accuracyMeters: payloadNumber(command.payload, 'accuracyMeters'),
    photoDocumentId: payloadString(command.payload, 'photoDocumentId') ?? documents[0],
    customerSignDocumentId: payloadString(command.payload, 'customerSignDocumentId') ?? payloadString(command.payload, 'signatureDocumentId'),
  };
}

function serviceReportPayload(command: OfflineCommandEnvelope) {
  const report = payloadRecord(command.payload, 'serviceReport');
  const parts = Array.isArray(command.payload.parts) ? command.payload.parts : Array.isArray(report.parts) ? report.parts : [];
  return {
    arrivalAt: payloadString(report, 'arrivalAt') ?? payloadString(command.payload, 'arrivalAt') ?? command.occurredAt,
    departureAt: payloadString(report, 'departureAt') ?? payloadString(command.payload, 'departureAt') ?? command.occurredAt,
    workPerformed: payloadString(report, 'workPerformed') ?? payloadString(command.payload, 'workPerformed') ?? 'Offline technician service report',
    rootCause: payloadString(report, 'rootCause') ?? payloadString(command.payload, 'rootCause') ?? 'Recorded offline by technician PWA',
    resolution: payloadString(report, 'resolution') ?? payloadString(command.payload, 'resolution') ?? 'Recorded offline and synchronized when connectivity returned.',
    beforePhotoDocumentId: payloadString(report, 'beforePhotoDocumentId') ?? payloadString(command.payload, 'beforePhotoDocumentId'),
    afterPhotoDocumentId: payloadString(report, 'afterPhotoDocumentId') ?? payloadString(command.payload, 'afterPhotoDocumentId'),
    customerSignDocumentId: payloadString(report, 'customerSignDocumentId') ?? payloadString(command.payload, 'customerSignDocumentId'),
    technicianSignDocumentId: payloadString(report, 'technicianSignDocumentId') ?? payloadString(command.payload, 'technicianSignDocumentId'),
    parts,
  };
}

export class FieldServiceService {
  constructor(
    private readonly numbers:NumberSequenceFacade,
    private readonly customers:CustomerFacade,
    private readonly assets:AssetFacade,
    private readonly employees:EmployeeFacade,
    private readonly inventory:InventoryFacade,
    private readonly access:PlatformAccessFacade,
    private readonly repository=new FieldServiceRepository(),
    private readonly audit=new AuditWriter(),
    private readonly events=new BusinessEventWriter(),
  ) {}
  private enabled(org:string){return this.access.assertModuleEnabled(org,'service');}

  private async actorTechnician(tenant:TenantRequestContext,userId:string,workOrderId:string,tx?:TransactionClient){
    const employee=await this.employees.employeeForUser(tenant.organizationId,userId);
    const assignment=tx?await this.repository.activeAssignmentTx(tx,workOrderId):await this.repository.activeAssignment(workOrderId);
    if(!assignment||assignment.technicianId!==employee.id)throw new AppError(403,'WORK_ORDER_TECHNICIAN_SCOPE_DENIED','This command is restricted to the currently assigned technician.');
    return{employee,assignment};
  }


  async createMaintenanceWorkOrder(
    input: {
      organizationId: string;
      branchId: string | null;
      assetId: string;
      projectId: string | null;
      scheduledAt: Date;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      actorUserId: string;
      maintenanceScheduleId: string;
      afterCreate: (tx: TransactionClient, workOrder: { id: string; workOrderNo: string }) => Promise<void>;
    },
  ) {
    return this.numbers.withBusinessNumber({
      organizationId: input.organizationId,
      branchId: input.branchId,
      entityType: 'WORK_ORDER',
      fiscalYear: input.scheduledAt.getUTCFullYear(),
      targetType: 'WorkOrder',
      createTarget: async (tx, workOrderNo) => {
        const row = await this.repository.createWorkOrder(tx, {
          organizationId: input.organizationId,
          branchId: input.branchId,
          workOrderNo,
          ticketId: null,
          assetId: input.assetId,
          projectId: input.projectId,
          scheduledAt: input.scheduledAt,
          priority: input.priority,
        });

        await input.afterCreate(tx, { id: row.id, workOrderNo: row.workOrderNo });

        await this.audit.append(tx, {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: 'MAINTENANCE_WORK_ORDER_CREATED',
          subjectType: 'WorkOrder',
          subjectId: row.id,
          afterJson: {
            workOrderNo: row.workOrderNo,
            assetId: row.assetId,
            projectId: row.projectId,
            scheduledAt: row.scheduledAt,
            maintenanceScheduleId: input.maintenanceScheduleId,
          },
          ip: null,
        });
        return row;
      },
    });
  }

  async listTickets(tenant:TenantRequestContext,q:any){await this.enabled(tenant.organizationId);const p=paging(q);const {rows,total}=await this.repository.listTickets({organizationId:tenant.organizationId,branchId:tenant.branchId,status:q.status,priority:q.priority,customerId:q.customerId,siteId:q.siteId,assetId:q.assetId,assignedToId:q.assignedToId,skip:p.skip,take:p.take});return{rows:rows.map((r:any)=>({...r,sla:slaSnapshot(r)})),total,page:p.page,pageSize:p.pageSize};}
  async getTicket(tenant:TenantRequestContext,id:string){await this.enabled(tenant.organizationId);const row=await this.repository.getTicket(tenant.organizationId,tenant.branchId,id);if(!row)throw new AppError(404,'TICKET_NOT_FOUND','Ticket not found.');return{...row,sla:slaSnapshot(row)};}

  async createTicket(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},input:any){
    await this.enabled(tenant.organizationId);
    await this.customers.customerForProject(tenant.organizationId,input.customerId);
    await this.customers.siteForProject(tenant.organizationId,input.customerId,input.siteId);
    const asset=await this.assets.assertAsset(tenant.organizationId,input.assetId);
    assertTicketAssetPlacement({ assetCustomerId: asset.customerId, assetSiteId: asset.siteId, ticketCustomerId: input.customerId, ticketSiteId: input.siteId });
    return this.numbers.withBusinessNumber({organizationId:tenant.organizationId,branchId:tenant.branchId,entityType:'TICKET',fiscalYear:new Date().getUTCFullYear(),targetType:'Ticket',createTarget:async(tx,ticketNo)=>{
      const sla=await this.repository.ensureSlaPolicy(tx,tenant.organizationId,input.priority);const now=new Date();
      const row=await this.repository.createTicket(tx,{organizationId:tenant.organizationId,branchId:tenant.branchId,ticketNo,customerId:input.customerId,siteId:input.siteId,assetId:input.assetId,category:input.category,priority:input.priority,subject:input.subject,description:input.description,openedById:actor.userId,slaPolicyId:sla.id,responseDueAt:addMinutes(now,sla.responseMinutes),resolutionDueAt:addMinutes(now,sla.resolutionMinutes)});
      await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'TICKET_CREATED',subjectType:'Ticket',subjectId:row.id,afterJson:{ticketNo:row.ticketNo,customerId:row.customerId,siteId:row.siteId,assetId:row.assetId,category:row.category,priority:row.priority,status:row.status,slaPolicyId:row.slaPolicyId},ip:actor.ip});
      await this.events.append(tx,{organizationId:tenant.organizationId,type:'ticket.created',aggregateType:'Ticket',aggregateId:row.id,payload:{ticketNo:row.ticketNo,priority:row.priority,assetId:row.assetId}});
      assertSlaSnapshotCompleteness({ responseDueAt: row.responseDueAt, resolutionDueAt: row.resolutionDueAt, responseMinutes: row.slaPolicy.responseMinutes, resolutionMinutes: row.slaPolicy.resolutionMinutes });return{id:row.id,ticketNo:row.ticketNo,status:row.status,sla:slaSnapshot(row)};
    }});
  }

  async updateTicket(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,input:any){await this.enabled(tenant.organizationId);return withTransaction(async tx=>{
    const before=await this.repository.lockTicket(tx,tenant.organizationId,tenant.branchId,id);if(!before)throw new AppError(404,'TICKET_NOT_FOUND','Ticket not found.');
    if(['RESOLVED','CLOSED','CANCELLED'].includes(before.status))throw new AppError(409,'TICKET_TERMINAL_STATE','Resolved, closed or cancelled ticket cannot be edited through PATCH.');
    if(input.status&&input.status!==before.status&&!((ticketPatchTransitions[before.status]??[]).includes(input.status)))throw new AppError(409,'TICKET_INVALID_STATE_TRANSITION','Ticket status transition is not allowed through PATCH.',{currentStatus:before.status,requestedStatus:input.status});
    let slaPolicyId=before.slaPolicyId,responseDueAt=before.responseDueAt,resolutionDueAt=before.resolutionDueAt;
    if(input.priority&&input.priority!==before.priority){const sla=await this.repository.ensureSlaPolicy(tx,tenant.organizationId,input.priority);slaPolicyId=sla.id;responseDueAt=addMinutes(before.createdAt,sla.responseMinutes);resolutionDueAt=addMinutes(before.createdAt,sla.resolutionMinutes);}
    const row=await this.repository.updateTicket(tx,id,{...(input.category!==undefined?{category:input.category}:{}),...(input.priority!==undefined?{priority:input.priority,slaPolicyId,responseDueAt,resolutionDueAt}:{}),...(input.subject!==undefined?{subject:input.subject}:{}),...(input.description!==undefined?{description:input.description}:{}),...(input.status!==undefined?{status:input.status}:{})});
    await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'TICKET_UPDATED',subjectType:'Ticket',subjectId:id,beforeJson:{category:before.category,priority:before.priority,subject:before.subject,status:before.status},afterJson:{category:row.category,priority:row.priority,subject:row.subject,status:row.status},ip:actor.ip});return{...row,sla:slaSnapshot(row)};
  });}

  async assignTicket(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,assigneeId:string){await this.enabled(tenant.organizationId);const assignee=await this.employees.employeeForProject(tenant.organizationId,assigneeId);if(tenant.branchId&&assignee.branchId!==tenant.branchId)throw new AppError(403,'TICKET_ASSIGNMENT_BRANCH_DENIED','Ticket assignee must belong to the active branch.');return withTransaction(async tx=>{
    const ticket=await this.repository.lockTicket(tx,tenant.organizationId,tenant.branchId,id);if(!ticket)throw new AppError(404,'TICKET_NOT_FOUND','Ticket not found.');assertTicketAssignable(ticket.status);
    const row=await this.repository.updateTicket(tx,id,{assignedToId:assignee.id,status:'ASSIGNED',firstRespondedAt:ticket.firstRespondedAt??new Date()});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'TICKET_ASSIGNED',subjectType:'Ticket',subjectId:id,beforeJson:{assignedToId:ticket.assignedToId,status:ticket.status},afterJson:{assignedToId:assignee.id,status:row.status,firstRespondedAt:row.firstRespondedAt},ip:actor.ip});return{...row,sla:slaSnapshot(row)};
  });}

  async resolveTicket(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,resolution:string){await this.enabled(tenant.organizationId);return withTransaction(async tx=>{
    const ticket=await this.repository.lockTicket(tx,tenant.organizationId,tenant.branchId,id);if(!ticket)throw new AppError(404,'TICKET_NOT_FOUND','Ticket not found.');assertTicketResolvable(ticket.status);
    const row=await this.repository.updateTicket(tx,id,{status:'RESOLVED',resolvedAt:new Date()});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'TICKET_RESOLVED',subjectType:'Ticket',subjectId:id,beforeJson:{status:ticket.status},afterJson:{status:'RESOLVED',resolution},ip:actor.ip});return{...row,sla:slaSnapshot(row)};
  });}

  async closeTicket(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,input:{customerConfirmed:true;comment?:string}){await this.enabled(tenant.organizationId);return withTransaction(async tx=>{
    const ticket=await this.repository.lockTicket(tx,tenant.organizationId,tenant.branchId,id);if(!ticket)throw new AppError(404,'TICKET_NOT_FOUND','Ticket not found.');assertTicketClosable(ticket.status, input.customerConfirmed);
    const row=await this.repository.updateTicket(tx,id,{status:'CLOSED',closedAt:new Date()});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'TICKET_CLOSED',subjectType:'Ticket',subjectId:id,beforeJson:{status:'RESOLVED'},afterJson:{status:'CLOSED',customerConfirmed:true,comment:input.comment??null},ip:actor.ip});return{...row,sla:slaSnapshot(row)};
  });}

  async listWorkOrders(tenant:TenantRequestContext,q:any){await this.enabled(tenant.organizationId);const p=paging(q);const {rows,total}=await this.repository.listWorkOrders({organizationId:tenant.organizationId,branchId:tenant.branchId,status:q.status,priority:q.priority,ticketId:q.ticketId,assetId:q.assetId,projectId:q.projectId,technicianId:q.technicianId,skip:p.skip,take:p.take});return{rows,total,page:p.page,pageSize:p.pageSize};}
  async getWorkOrder(tenant:TenantRequestContext,id:string){await this.enabled(tenant.organizationId);const row=await this.repository.getWorkOrder(tenant.organizationId,tenant.branchId,id);if(!row)throw new AppError(404,'WORK_ORDER_NOT_FOUND','Work order not found.');return row;}

  async createWorkOrder(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},input:any){await this.enabled(tenant.organizationId);const ticket=await this.repository.getTicket(tenant.organizationId,tenant.branchId,input.ticketId);if(!ticket)throw new AppError(404,'TICKET_NOT_FOUND','Ticket not found.');if(['CLOSED','CANCELLED'].includes(ticket.status))throw new AppError(409,'WORK_ORDER_TICKET_TERMINAL','Closed or cancelled ticket cannot create a work order.');const asset=await this.assets.assertAsset(tenant.organizationId,ticket.assetId);
    return this.numbers.withBusinessNumber({organizationId:tenant.organizationId,branchId:ticket.branchId,entityType:'WORK_ORDER',fiscalYear:new Date().getUTCFullYear(),targetType:'WorkOrder',createTarget:async(tx,workOrderNo)=>{const row=await this.repository.createWorkOrder(tx,{organizationId:tenant.organizationId,branchId:ticket.branchId,workOrderNo,ticketId:ticket.id,assetId:ticket.assetId,projectId:asset.projectId??null,scheduledAt:input.scheduledAt?new Date(input.scheduledAt):null,priority:input.priority??ticket.priority});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'WORK_ORDER_CREATED',subjectType:'WorkOrder',subjectId:row.id,afterJson:{workOrderNo:row.workOrderNo,ticketId:row.ticketId,assetId:row.assetId,projectId:row.projectId,priority:row.priority,status:row.status},ip:actor.ip});return row;}});
  }

  async updateWorkOrder(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,input:any){await this.enabled(tenant.organizationId);return withTransaction(async tx=>{const before=await this.repository.lockWorkOrder(tx,tenant.organizationId,tenant.branchId,id);if(!before)throw new AppError(404,'WORK_ORDER_NOT_FOUND','Work order not found.');if(['CLOSED','CANCELLED'].includes(before.status))throw new AppError(409,'WORK_ORDER_TERMINAL_STATE','Closed or cancelled work orders cannot be patched.');if(input.status==='WAITING_FOR_PART'&&before.status!=='WORK_IN_PROGRESS')throw new AppError(409,'WORK_ORDER_WAITING_PART_INVALID_STATE','Only WORK_IN_PROGRESS can transition to WAITING_FOR_PART.');if(input.status==='CANCELLED'&&['RESOLVED','CUSTOMER_CONFIRMATION'].includes(before.status))throw new AppError(409,'WORK_ORDER_CANCEL_INVALID_STATE','Resolved work order cannot be cancelled.');const row=await this.repository.updateWorkOrder(tx,id,{...(input.scheduledAt!==undefined?{scheduledAt:input.scheduledAt?new Date(input.scheduledAt):null}:{}),...(input.priority!==undefined?{priority:input.priority}:{}),...(input.status!==undefined?{status:input.status}:{})});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'WORK_ORDER_UPDATED',subjectType:'WorkOrder',subjectId:id,beforeJson:{status:before.status,scheduledAt:before.scheduledAt,priority:before.priority},afterJson:{status:row.status,scheduledAt:row.scheduledAt,priority:row.priority},ip:actor.ip});return row;});}

  async assignWorkOrder(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,input:any){await this.enabled(tenant.organizationId);const technician=await this.employees.employeeForProject(tenant.organizationId,input.technicianId);return withTransaction(async tx=>{
    const wo=await this.repository.lockWorkOrder(tx,tenant.organizationId,tenant.branchId,id);if(!wo)throw new AppError(404,'WORK_ORDER_NOT_FOUND','Work order not found.');assertWorkOrderAssignable(wo.status);if(wo.branchId&&technician.branchId!==wo.branchId)throw new AppError(403,'WORK_ORDER_TECHNICIAN_BRANCH_DENIED','Technician must belong to the work-order branch.');
    const previous=await this.repository.activeAssignmentTx(tx,id);if(previous?.acceptedAt)throw new AppError(409,'WORK_ORDER_REASSIGN_ACCEPTED','Accepted technician assignment cannot be silently replaced.');if(previous){await this.repository.closeAssignments(tx,id);await this.repository.upsertTechnicianProfile(tx,{employeeId:previous.technicianId,organizationId:tenant.organizationId,homeBranchId:technician.branchId,availabilityStatus:'AVAILABLE'});}if(wo.status==='NEW')await this.repository.updateWorkOrder(tx,id,{status:'VALIDATED'});
    const assignment=await this.repository.createAssignment(tx,{organizationId:tenant.organizationId,workOrderId:id,technicianId:technician.id});await this.repository.upsertTechnicianProfile(tx,{employeeId:technician.id,organizationId:tenant.organizationId,homeBranchId:technician.branchId,availabilityStatus:'ASSIGNED'});const row=await this.repository.updateWorkOrder(tx,id,{status:'ASSIGNED',...(input.scheduledAt!==undefined?{scheduledAt:input.scheduledAt?new Date(input.scheduledAt):null}:{})});
    if(wo.ticketId){const ticket=await this.repository.lockTicket(tx,tenant.organizationId,wo.branchId,wo.ticketId);if(ticket&&ticket.status==='OPEN')await this.repository.updateTicket(tx,ticket.id,{status:'ASSIGNED',firstRespondedAt:ticket.firstRespondedAt??new Date(),assignedToId:technician.id});}
    await this.events.append(tx,{organizationId:tenant.organizationId,type:'work_order.assigned',aggregateType:'WorkOrder',aggregateId:id,payload:{workOrderNo:wo.workOrderNo,technicianId:technician.id,assignmentId:assignment.id}});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'WORK_ORDER_ASSIGNED',subjectType:'WorkOrder',subjectId:id,beforeJson:{status:wo.status,technicianId:previous?.technicianId??null},afterJson:{status:row.status,technicianId:technician.id,assignmentId:assignment.id},ip:actor.ip});return row;
  });}

  async acceptWorkOrder(tenant:TenantRequestContext,userId:string,id:string){await this.enabled(tenant.organizationId);return withTransaction(async tx=>{const wo=await this.repository.lockWorkOrder(tx,tenant.organizationId,tenant.branchId,id);if(!wo)throw new AppError(404,'WORK_ORDER_NOT_FOUND','Work order not found.');if(wo.status!=='ASSIGNED')throw new AppError(409,'WORK_ORDER_ACCEPT_INVALID_STATE','Only ASSIGNED work order can be accepted.');const {assignment}=await this.actorTechnician(tenant,userId,id,tx);await this.repository.acceptAssignment(tx,assignment.id);const row=await this.repository.updateWorkOrder(tx,id,{status:'TECHNICIAN_ACCEPTED'});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:'WORK_ORDER_TECHNICIAN_ACCEPTED',subjectType:'WorkOrder',subjectId:id,beforeJson:{status:'ASSIGNED'},afterJson:{status:row.status},ip:null});return row;});}

  async technicianCommand(tenant:TenantRequestContext,userId:string,id:string,command:'start-travel'|'arrive'|'start',note?:string){await this.enabled(tenant.organizationId);return withTransaction(async tx=>{const wo=await this.repository.lockWorkOrder(tx,tenant.organizationId,tenant.branchId,id);if(!wo)throw new AppError(404,'WORK_ORDER_NOT_FOUND','Work order not found.');const {employee}=await this.actorTechnician(tenant,userId,id,tx);const next=nextTechnicianCommandStatus(command, wo.status as WorkOrderState);if(command==='arrive')await this.repository.updateTechnicianAvailability(tx,employee.id,'ON_SITE');if(command==='start'&&wo.status==='ON_SITE')await this.repository.updateWorkOrder(tx,id,{status:'DIAGNOSIS'});const row=await this.repository.updateWorkOrder(tx,id,{status:next});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:userId,action:`WORK_ORDER_${command.replaceAll('-','_').toUpperCase()}`,subjectType:'WorkOrder',subjectId:id,beforeJson:{status:wo.status},afterJson:{status:row.status,note:note??null},ip:null});return row;});}

  async createServiceReport(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,input:any){await this.enabled(tenant.organizationId);const wo=await this.repository.getWorkOrder(tenant.organizationId,tenant.branchId,id);if(!wo)throw new AppError(404,'WORK_ORDER_NOT_FOUND','Work order not found.');assertServiceReportAllowed(wo.status);const {employee}=await this.actorTechnician(tenant,actor.userId,id);
    for(const part of input.parts){const {product}=await this.inventory.validateServicePartSource(tenant.organizationId,{warehouseId:part.sourceWarehouseId,locationId:part.sourceLocationId??null,productId:part.productId});assertServicePartTracking({ productId: part.productId, trackingType: product.trackingType, batchCount: part.batches.length });}
    assertServiceReportTimeWindow(new Date(input.arrivalAt), new Date(input.departureAt));
    return withTransaction(async tx=>{const row=await this.repository.createServiceReport(tx,{organizationId:tenant.organizationId,workOrderId:id,technicianId:employee.id,arrivalAt:new Date(input.arrivalAt),departureAt:new Date(input.departureAt),workPerformed:input.workPerformed,rootCause:input.rootCause,resolution:input.resolution,beforePhotoDocumentId:input.beforePhotoDocumentId??null,afterPhotoDocumentId:input.afterPhotoDocumentId??null,customerSignDocumentId:input.customerSignDocumentId??null,technicianSignDocumentId:input.technicianSignDocumentId??null,parts:input.parts.map((p:any)=>({organizationId:tenant.organizationId,productId:p.productId,qty:new Prisma.Decimal(p.qty),sourceWarehouseId:p.sourceWarehouseId,sourceLocationId:p.sourceLocationId??null,batchAllocationsJson:p.batches}))});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'SERVICE_REPORT_CREATED',subjectType:'ServiceReport',subjectId:row.id,afterJson:{workOrderId:id,technicianId:employee.id,status:row.status,partCount:row.parts.length},ip:actor.ip});return row;});
  }

  async completeWorkOrder(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,input:{serviceReportId:string;customerConfirmed:boolean}){await this.enabled(tenant.organizationId);return withTransaction(async tx=>{
    const wo=await this.repository.lockWorkOrder(tx,tenant.organizationId,tenant.branchId,id);if(!wo)throw new AppError(404,'WORK_ORDER_NOT_FOUND','Work order not found.');const technicianScope=await this.actorTechnician(tenant,actor.userId,id,tx);const assignment=technicianScope.assignment;assertAssignedTechnicianCommandScope({ assignedTechnicianId: assignment.technicianId, actorEmployeeId: technicianScope.employee.id, command: 'workorder.complete' });const report=await this.repository.lockServiceReport(tx,tenant.organizationId,id,input.serviceReportId);const visit=assignment?await this.repository.latestCompletedVisit(tx,id,assignment.technicianId):null;assertWorkOrderCompletionAllowed({ status: wo.status, acceptedAssignment: Boolean(assignment?.acceptedAt), reportIsDraft: Boolean(report&&report.status==='DRAFT'), reportTechnicianMatchesAssignment: Boolean(report&&assignment&&report.technicianId===assignment.technicianId), completedVisitExists: Boolean(visit?.checkedOutAt), customerConfirmed: input.customerConfirmed });assertFieldServiceReportCompletionEvidence({ status: wo.status as WorkOrderState, reportStatus: report?.status, completedVisitExists: Boolean(visit?.checkedOutAt), customerConfirmed: input.customerConfirmed, partCount: report ? await this.repository.countServiceReportParts(tx, report.id) : 0, linkedPartCount: report ? await this.repository.countLinkedServiceReportParts(tx, report.id) : 0 });if(!assignment||!report||!visit)throw new AppError(500,'WORK_ORDER_COMPLETION_INVARIANT_INVALID','Completion invariant was not satisfied after policy guard.');
    const parts=await this.repository.serviceReportParts(tx,report.id);const consumed:Array<{productId:string;qty:string;stockTransactionId:string|null}>=[];for(const part of parts){if(part.stockTransactionId)throw new AppError(409,'SERVICE_REPORT_PART_ALREADY_CONSUMED','Service report part already has a stock transaction.');const raw=Array.isArray(part.batchAllocationsJson)?part.batchAllocationsJson:[];const batches=raw.map((r:any)=>({lotNo:String(r.lotNo),qty:new Prisma.Decimal(String(r.qty))}));const ledger=await this.inventory.consumeServicePart(tx,{organizationId:tenant.organizationId,warehouseId:part.sourceWarehouseId,locationId:part.sourceLocationId,productId:part.productId,qty:part.qty,referenceId:report.id,batches});await this.repository.linkPartTransaction(tx,part.id,ledger.id);consumed.push({productId:part.productId,qty:part.qty.toString(),stockTransactionId:ledger.id});}
    await this.repository.finalizeServiceReport(tx,report.id);await this.repository.verifyVisitCompletion(tx,visit.id);await this.repository.updateWorkOrder(tx,id,{status:'RESOLVED'});await this.repository.updateWorkOrder(tx,id,{status:'CUSTOMER_CONFIRMATION'});const closedAt=new Date();await this.repository.updateWorkOrder(tx,id,{status:'CLOSED',closedAt});await this.repository.updateTechnicianAvailability(tx,assignment.technicianId,'AVAILABLE');if(wo.ticketId){const ticket=await this.repository.lockTicket(tx,tenant.organizationId,wo.branchId,wo.ticketId);if(ticket&&!['RESOLVED','CLOSED','CANCELLED'].includes(ticket.status))await this.repository.updateTicket(tx,ticket.id,{status:'RESOLVED',resolvedAt:closedAt});}
    await this.assets.recordFieldServiceCompletion(tx,{organizationId:tenant.organizationId,assetId:wo.assetId,workOrderId:id,serviceReportId:report.id,technicianId:assignment.technicianId,resolution:report.resolution,parts:consumed});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'WORK_ORDER_COMPLETED',subjectType:'WorkOrder',subjectId:id,beforeJson:{status:wo.status},afterJson:{status:'CLOSED',closedAt,serviceReportId:report.id,serviceVisitId:visit.id,customerConfirmed:true,parts:consumed},ip:actor.ip});await this.events.append(tx,{organizationId:tenant.organizationId,type:'work_order.completed',aggregateType:'WorkOrder',aggregateId:id,payload:{workOrderNo:wo.workOrderNo,assetId:wo.assetId,serviceReportId:report.id,technicianId:assignment.technicianId}});return{id,status:'CLOSED',closedAt:closedAt.toISOString()};
  });}

  async checkIn(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,input:any){await this.enabled(tenant.organizationId);const policy=await this.access.technicianVisitPolicy(tenant.organizationId);return withTransaction(async tx=>{await this.repository.purgeExpiredLocationData(tx,tenant.organizationId,new Date());const wo=await this.repository.lockWorkOrder(tx,tenant.organizationId,tenant.branchId,id);if(!wo)throw new AppError(404,'WORK_ORDER_NOT_FOUND','Work order not found.');const {employee}=await this.actorTechnician(tenant,actor.userId,id,tx);const activeVisit=await this.repository.activeVisit(tx,id,employee.id);const at=input.capturedAt?new Date(input.capturedAt):new Date();assertVisitCheckInAllowed({ status: wo.status, activeVisitExists: Boolean(activeVisit), policy, hasLocation: input.latitude!==undefined||input.longitude!==undefined, hasPhotoProof: Boolean(input.photoDocumentId) });const visit=await this.repository.createVisit(tx,{organizationId:tenant.organizationId,branchId:wo.branchId,workOrderId:id,technicianId:employee.id,checkedInAt:at});let proofId:string|null=null;if(input.photoDocumentId||(policy.locationEnabled&&input.latitude!==undefined)){const proof=await this.repository.createVisitLocation(tx,{organizationId:tenant.organizationId,serviceVisitId:visit.id,kind:'CHECK_IN',latitude:policy.locationEnabled&&input.latitude!==undefined?new Prisma.Decimal(input.latitude):null,longitude:policy.locationEnabled&&input.longitude!==undefined?new Prisma.Decimal(input.longitude):null,accuracyMeters:policy.locationEnabled&&input.accuracyMeters!==undefined?new Prisma.Decimal(input.accuracyMeters):null,photoDocumentId:input.photoDocumentId??null,capturedAt:at,retainUntil:retentionDate(at,policy.retentionDays)});proofId=proof.id;}const check=await this.repository.createCheckIn(tx,{organizationId:tenant.organizationId,branchId:wo.branchId,workOrderId:id,serviceVisitId:visit.id,technicianId:employee.id,locationProofId:proofId,photoDocumentId:input.photoDocumentId??null,checkedInAt:at});await this.repository.createRoute(tx,{organizationId:tenant.organizationId,branchId:wo.branchId,workOrderId:id,technicianId:employee.id,startedAt:at});if(wo.status!=='ON_SITE')await this.repository.updateWorkOrder(tx,id,{status:'ON_SITE'});await this.repository.upsertTechnicianProfile(tx,{employeeId:employee.id,organizationId:tenant.organizationId,homeBranchId:employee.branchId,availabilityStatus:'ON_SITE'});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'WORK_ORDER_CHECKED_IN',subjectType:'WorkOrder',subjectId:id,afterJson:{serviceVisitId:visit.id,checkInId:check.id,checkedInAt:at,locationCaptured:policy.locationEnabled&&input.latitude!==undefined,photoProof:Boolean(input.photoDocumentId)},ip:actor.ip});return{workOrderId:id,serviceVisitId:visit.id,checkedInAt:at,status:'ON_SITE'};});}

  async recordLocation(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,input:any){await this.enabled(tenant.organizationId);const policy=await this.access.technicianVisitPolicy(tenant.organizationId);assertVisitLocationPolicy(policy, true);return withTransaction(async tx=>{await this.repository.purgeExpiredLocationData(tx,tenant.organizationId,new Date());const wo=await this.repository.lockWorkOrder(tx,tenant.organizationId,tenant.branchId,id);if(!wo)throw new AppError(404,'WORK_ORDER_NOT_FOUND','Work order not found.');const {employee}=await this.actorTechnician(tenant,actor.userId,id,tx);const visit=await this.repository.activeVisit(tx,id,employee.id);assertActiveVisitRequired(visit);const at=input.capturedAt?new Date(input.capturedAt):new Date();const row=await this.repository.createLocationPing(tx,{organizationId:tenant.organizationId,branchId:wo.branchId,technicianId:employee.id,workOrderId:id,serviceVisitId:visit.id,latitude:new Prisma.Decimal(input.latitude),longitude:new Prisma.Decimal(input.longitude),accuracyMeters:input.accuracyMeters===undefined?null:new Prisma.Decimal(input.accuracyMeters),capturedAt:at,retainUntil:retentionDate(at,policy.retentionDays)});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'TECHNICIAN_LOCATION_RECORDED',subjectType:'ServiceVisit',subjectId:visit.id,afterJson:{pingId:row.id,capturedAt:at,retentionDays:policy.retentionDays},ip:actor.ip});return{id:row.id,serviceVisitId:visit.id,capturedAt:at};});}

  async checkOut(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},id:string,input:any){await this.enabled(tenant.organizationId);const policy=await this.access.technicianVisitPolicy(tenant.organizationId);return withTransaction(async tx=>{await this.repository.purgeExpiredLocationData(tx,tenant.organizationId,new Date());const wo=await this.repository.lockWorkOrder(tx,tenant.organizationId,tenant.branchId,id);if(!wo)throw new AppError(404,'WORK_ORDER_NOT_FOUND','Work order not found.');const {employee}=await this.actorTechnician(tenant,actor.userId,id,tx);const visit=await this.repository.activeVisit(tx,id,employee.id);assertActiveVisitRequired(visit);const at=input.capturedAt?new Date(input.capturedAt):new Date();assertVisitCheckOutAllowed({ policy, hasLocation: input.latitude!==undefined||input.longitude!==undefined, hasPhotoProof: Boolean(input.photoDocumentId), hasCustomerSignature: Boolean(input.customerSignDocumentId), checkedInAt: visit.checkedInAt, checkedOutAt: at });let proofId:string|null=null;if(input.photoDocumentId||(policy.locationEnabled&&input.latitude!==undefined)){const proof=await this.repository.createVisitLocation(tx,{organizationId:tenant.organizationId,serviceVisitId:visit.id,kind:'CHECK_OUT',latitude:policy.locationEnabled&&input.latitude!==undefined?new Prisma.Decimal(input.latitude):null,longitude:policy.locationEnabled&&input.longitude!==undefined?new Prisma.Decimal(input.longitude):null,accuracyMeters:policy.locationEnabled&&input.accuracyMeters!==undefined?new Prisma.Decimal(input.accuracyMeters):null,photoDocumentId:input.photoDocumentId??null,capturedAt:at,retainUntil:retentionDate(at,policy.retentionDays)});proofId=proof.id;}await this.repository.checkoutVisit(tx,visit.id,at);const check=await this.repository.createCheckOut(tx,{organizationId:tenant.organizationId,branchId:wo.branchId,workOrderId:id,serviceVisitId:visit.id,technicianId:employee.id,locationProofId:proofId,photoDocumentId:input.photoDocumentId??null,customerSignDocumentId:input.customerSignDocumentId??null,checkedOutAt:at});const route=await this.repository.activeRoute(tx,id,employee.id);if(route)await this.repository.finishRoute(tx,route.id,at);await this.repository.updateTechnicianAvailability(tx,employee.id,'ASSIGNED');await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'WORK_ORDER_CHECKED_OUT',subjectType:'WorkOrder',subjectId:id,afterJson:{serviceVisitId:visit.id,checkOutId:check.id,checkedOutAt:at,locationCaptured:policy.locationEnabled&&input.latitude!==undefined,photoProof:Boolean(input.photoDocumentId),customerSignature:Boolean(input.customerSignDocumentId)},ip:actor.ip});return{workOrderId:id,serviceVisitId:visit.id,checkedOutAt:at};});}
  async syncTechnicianOffline(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},input:{clientBatchId:string;deviceId:string;tenantClockAt:string;commands:OfflineCommandEnvelope[]}){
    await this.enabled(tenant.organizationId);
    const ordered=sortedOfflineCommands(input.commands);
    const accepted:string[]=[];const replayed:string[]=[];const rejected:Array<{clientCommandId:string;code:string;message:string;details?:unknown}>=[];
    for(const command of ordered){
      try{
        const result=await this.applyOfflineCommandWithIdempotency(tenant,actor,input,command);
        if(result.status==='REPLAYED')replayed.push(command.clientCommandId);else accepted.push(command.clientCommandId);
      }catch(error){
        if(error instanceof AppError){
          const rejectedCommand:{clientCommandId:string;code:string;message:string;details?:unknown}={clientCommandId:command.clientCommandId,code:error.code,message:error.message};
          if(error.details!==undefined)rejectedCommand.details=error.details;
          rejected.push(rejectedCommand);
        }
        else rejected.push({clientCommandId:command.clientCommandId,code:'OFFLINE_SYNC_COMMAND_FAILED',message:error instanceof Error?error.message:'Offline command failed.'});
      }
    }
    return{clientBatchId:input.clientBatchId,accepted,replayed,rejected};
  }

  private async applyOfflineCommandWithIdempotency(tenant:TenantRequestContext,actor:{userId:string;ip:string|null},batch:{clientBatchId:string;deviceId:string;tenantClockAt:string},command:OfflineCommandEnvelope):Promise<OfflineSyncCommandResult>{
    const requestHash=stableRequestHash({deviceId:batch.deviceId,clientCommandId:command.clientCommandId,workOrderId:command.workOrderId,type:offlineCommandType(command),occurredAt:command.occurredAt,payload:command.payload});
    const key=offlineCommandIdempotencyKey(batch.deviceId,command.clientCommandId);
    return withTransaction(async tx=>{
      const existing=await this.repository.findOfflineIdempotency(tx,tenant.organizationId,OFFLINE_SYNC_ROUTE,key);
      if(existing){
        if(existing.expiresAt<=new Date())throw new AppError(409,'OFFLINE_SYNC_IDEMPOTENCY_KEY_EXPIRED','Offline command idempotency key has expired.',{clientCommandId:command.clientCommandId});
        if(existing.requestHash!==requestHash)throw new AppError(409,'OFFLINE_SYNC_REPLAY_PAYLOAD_CONFLICT','Offline command replay used the same device/clientCommandId with a different payload.',{clientCommandId:command.clientCommandId});
        return{clientCommandId:command.clientCommandId,status:'REPLAYED',result:existing.responseJson??{clientCommandId:command.clientCommandId,pending:true}};
      }
      assertOfflineCommandFresh({occurredAt:new Date(command.occurredAt),tenantClockAt:new Date(batch.tenantClockAt),maxOfflineHours:OFFLINE_SYNC_MAX_HOURS,clientCommandId:command.clientCommandId});
      await this.repository.createOfflineIdempotency(tx,{organizationId:tenant.organizationId,route:OFFLINE_SYNC_ROUTE,key,requestHash,expiresAt:new Date(Date.now()+OFFLINE_SYNC_TTL_SECONDS*1000)});
      const result=await this.applyOfflineCommandAtomic(tx,tenant,actor,batch,command);
      await this.repository.storeOfflineIdempotencyResponse(tx,tenant.organizationId,OFFLINE_SYNC_ROUTE,key,result);
      return{clientCommandId:command.clientCommandId,status:'ACCEPTED',result};
    });
  }

  private async assertOfflineCommandScope(tx:TransactionClient,tenant:TenantRequestContext,actor:{userId:string},command:OfflineCommandEnvelope){
    const wo=await this.repository.lockWorkOrder(tx,tenant.organizationId,tenant.branchId,command.workOrderId);
    if(!wo)throw new AppError(404,'WORK_ORDER_NOT_FOUND','Work order not found.');
    const employee=await this.employees.employeeForUser(tenant.organizationId,actor.userId);
    const assignment=await this.repository.activeAssignmentTx(tx,command.workOrderId);
    assertOfflineTechnicianScope({authenticatedTechnicianEmployeeId:employee.id,payloadTechnicianEmployeeId:command.technicianEmployeeId??null,assignedTechnicianId:assignment?.technicianId??null,clientCommandId:command.clientCommandId});
    if(tenant.branchId&&wo.branchId&&tenant.branchId!==wo.branchId)throw new AppError(403,'OFFLINE_SYNC_BRANCH_SCOPE_DENIED','Offline command work order is outside active branch scope.',{clientCommandId:command.clientCommandId});
    return{wo,employee,assignment};
  }

  private async applyOfflineCommandAtomic(tx:TransactionClient,tenant:TenantRequestContext,actor:{userId:string;ip:string|null},batch:{clientBatchId:string;deviceId:string;tenantClockAt:string},command:OfflineCommandEnvelope){
    const type=offlineCommandType(command);
    const scoped=await this.assertOfflineCommandScope(tx,tenant,actor,command);
    if(type==='ACCEPT')return this.applyOfflineAccept(tx,tenant,actor,command,scoped.wo,scoped.assignment?.id??null);
    if(type==='START_TRAVEL'||type==='ARRIVE'||type==='START_WORK'||type==='STATUS_CHANGE')return this.applyOfflineStatusCommand(tx,tenant,actor,command,type,scoped.wo,scoped.employee.id);
    if(type==='CHECK_IN')return this.applyOfflineCheckIn(tx,tenant,actor,command,scoped.wo,scoped.employee.id);
    if(type==='LOCATION')return this.applyOfflineLocation(tx,tenant,actor,command,scoped.wo,scoped.employee.id);
    if(type==='CHECK_OUT')return this.applyOfflineCheckOut(tx,tenant,actor,command,scoped.wo,scoped.employee.id);
    if(type==='SERVICE_REPORT')return this.applyOfflineServiceReport(tx,tenant,actor,command,scoped.wo,scoped.employee.id);
    if(type==='COMPLETE')return this.applyOfflineComplete(tx,tenant,actor,command,scoped.wo,scoped.assignment?.technicianId??null);
    return this.applyOfflineEvidenceAudit(tx,tenant,actor,batch,command,type);
  }

  private async applyOfflineAccept(tx:TransactionClient,tenant:TenantRequestContext,actor:{userId:string;ip:string|null},command:OfflineCommandEnvelope,wo:{id:string;status:string},assignmentId:string|null){
    if(wo.status!=='ASSIGNED')throw new AppError(409,'WORK_ORDER_ACCEPT_INVALID_STATE','Only ASSIGNED work order can be accepted.',{clientCommandId:command.clientCommandId,currentStatus:wo.status});
    if(!assignmentId)throw new AppError(409,'OFFLINE_SYNC_ASSIGNMENT_REQUIRED','Offline acceptance requires an active assignment.',{clientCommandId:command.clientCommandId});
    await this.repository.acceptAssignment(tx,assignmentId);
    const row=await this.repository.updateWorkOrder(tx,command.workOrderId,{status:'TECHNICIAN_ACCEPTED'});
    await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'WORK_ORDER_OFFLINE_ACCEPTED',subjectType:'WorkOrder',subjectId:command.workOrderId,beforeJson:{status:wo.status,clientCommandId:command.clientCommandId},afterJson:{status:row.status,occurredAt:command.occurredAt},ip:actor.ip});
    return{clientCommandId:command.clientCommandId,workOrderId:command.workOrderId,status:row.status};
  }

  private async applyOfflineStatusCommand(tx:TransactionClient,tenant:TenantRequestContext,actor:{userId:string;ip:string|null},command:OfflineCommandEnvelope,type:OfflineTechnicianCommandType,wo:{status:string},employeeId:string){
    const nextCommand=type==='START_TRAVEL'?'start-travel':type==='ARRIVE'?'arrive':type==='START_WORK'?'start':this.statusChangeToCommand(payloadString(command.payload,'nextStatus'));
    const next=nextTechnicianCommandStatus(nextCommand,wo.status as WorkOrderState);
    if(nextCommand==='arrive')await this.repository.updateTechnicianAvailability(tx,employeeId,'ON_SITE');
    if(nextCommand==='start'&&wo.status==='ON_SITE')await this.repository.updateWorkOrder(tx,command.workOrderId,{status:'DIAGNOSIS'});
    const row=await this.repository.updateWorkOrder(tx,command.workOrderId,{status:next});
    await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:`WORK_ORDER_OFFLINE_${type}`,subjectType:'WorkOrder',subjectId:command.workOrderId,beforeJson:{status:wo.status,clientCommandId:command.clientCommandId},afterJson:{status:row.status,occurredAt:command.occurredAt,note:payloadString(command.payload,'note')??null},ip:actor.ip});
    return{clientCommandId:command.clientCommandId,workOrderId:command.workOrderId,status:row.status};
  }

  private statusChangeToCommand(nextStatus:string|undefined):'start-travel'|'arrive'|'start'{
    if(nextStatus==='TRAVELLING')return'start-travel';
    if(nextStatus==='ON_SITE')return'arrive';
    if(nextStatus==='WORK_IN_PROGRESS')return'start';
    throw new AppError(409,'OFFLINE_SYNC_STATUS_CHANGE_UNSUPPORTED','Offline status change supports only TRAVELLING, ON_SITE or WORK_IN_PROGRESS command transitions.',{nextStatus});
  }

  private async applyOfflineCheckIn(tx:TransactionClient,tenant:TenantRequestContext,actor:{userId:string;ip:string|null},command:OfflineCommandEnvelope,wo:{id:string;branchId:string|null;status:string},employeeId:string){
    const policy=await this.access.technicianVisitPolicy(tenant.organizationId);await this.repository.purgeExpiredLocationData(tx,tenant.organizationId,new Date());const input=checkInPayload(command);const activeVisit=await this.repository.activeVisit(tx,command.workOrderId,employeeId);const at=new Date(input.capturedAt);assertVisitCheckInAllowed({status:wo.status,activeVisitExists:Boolean(activeVisit),policy,hasLocation:input.latitude!==undefined||input.longitude!==undefined,hasPhotoProof:Boolean(input.photoDocumentId)});const visit=await this.repository.createVisit(tx,{organizationId:tenant.organizationId,branchId:wo.branchId,workOrderId:command.workOrderId,technicianId:employeeId,checkedInAt:at});let proofId:string|null=null;if(input.photoDocumentId||(policy.locationEnabled&&input.latitude!==undefined)){const proof=await this.repository.createVisitLocation(tx,{organizationId:tenant.organizationId,serviceVisitId:visit.id,kind:'CHECK_IN',latitude:policy.locationEnabled&&input.latitude!==undefined?new Prisma.Decimal(input.latitude):null,longitude:policy.locationEnabled&&input.longitude!==undefined?new Prisma.Decimal(input.longitude):null,accuracyMeters:policy.locationEnabled&&input.accuracyMeters!==undefined?new Prisma.Decimal(input.accuracyMeters):null,photoDocumentId:input.photoDocumentId??null,capturedAt:at,retainUntil:retentionDate(at,policy.retentionDays)});proofId=proof.id;}const check=await this.repository.createCheckIn(tx,{organizationId:tenant.organizationId,branchId:wo.branchId,workOrderId:command.workOrderId,serviceVisitId:visit.id,technicianId:employeeId,locationProofId:proofId,photoDocumentId:input.photoDocumentId??null,checkedInAt:at});await this.repository.createRoute(tx,{organizationId:tenant.organizationId,branchId:wo.branchId,workOrderId:command.workOrderId,technicianId:employeeId,startedAt:at});if(wo.status!=='ON_SITE')await this.repository.updateWorkOrder(tx,command.workOrderId,{status:'ON_SITE'});await this.repository.updateTechnicianAvailability(tx,employeeId,'ON_SITE');await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'WORK_ORDER_OFFLINE_CHECKED_IN',subjectType:'WorkOrder',subjectId:command.workOrderId,afterJson:{clientCommandId:command.clientCommandId,serviceVisitId:visit.id,checkInId:check.id,checkedInAt:at,locationCaptured:policy.locationEnabled&&input.latitude!==undefined,photoProof:Boolean(input.photoDocumentId)},ip:actor.ip});return{clientCommandId:command.clientCommandId,workOrderId:command.workOrderId,serviceVisitId:visit.id,checkedInAt:at.toISOString(),status:'ON_SITE'};
  }

  private async applyOfflineLocation(tx:TransactionClient,tenant:TenantRequestContext,actor:{userId:string;ip:string|null},command:OfflineCommandEnvelope,wo:{branchId:string|null},employeeId:string){
    const policy=await this.access.technicianVisitPolicy(tenant.organizationId);assertVisitLocationPolicy(policy,true);const input=locationPayload(command);if(input.latitude===undefined||input.longitude===undefined)throw new AppError(400,'OFFLINE_SYNC_LOCATION_REQUIRED','Offline LOCATION command requires latitude and longitude.',{clientCommandId:command.clientCommandId});await this.repository.purgeExpiredLocationData(tx,tenant.organizationId,new Date());const visit=await this.repository.activeVisit(tx,command.workOrderId,employeeId);assertActiveVisitRequired(visit);const at=new Date(input.capturedAt);const row=await this.repository.createLocationPing(tx,{organizationId:tenant.organizationId,branchId:wo.branchId,technicianId:employeeId,workOrderId:command.workOrderId,serviceVisitId:visit.id,latitude:new Prisma.Decimal(input.latitude),longitude:new Prisma.Decimal(input.longitude),accuracyMeters:input.accuracyMeters===undefined?null:new Prisma.Decimal(input.accuracyMeters),capturedAt:at,retainUntil:retentionDate(at,policy.retentionDays)});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'TECHNICIAN_OFFLINE_LOCATION_RECORDED',subjectType:'ServiceVisit',subjectId:visit.id,afterJson:{clientCommandId:command.clientCommandId,pingId:row.id,capturedAt:at,retentionDays:policy.retentionDays},ip:actor.ip});return{clientCommandId:command.clientCommandId,id:row.id,serviceVisitId:visit.id,capturedAt:at.toISOString()};
  }

  private async applyOfflineCheckOut(tx:TransactionClient,tenant:TenantRequestContext,actor:{userId:string;ip:string|null},command:OfflineCommandEnvelope,wo:{branchId:string|null},employeeId:string){
    const policy=await this.access.technicianVisitPolicy(tenant.organizationId);const input=checkOutPayload(command);await this.repository.purgeExpiredLocationData(tx,tenant.organizationId,new Date());const visit=await this.repository.activeVisit(tx,command.workOrderId,employeeId);assertActiveVisitRequired(visit);const at=new Date(input.capturedAt);assertVisitCheckOutAllowed({policy,hasLocation:input.latitude!==undefined||input.longitude!==undefined,hasPhotoProof:Boolean(input.photoDocumentId),hasCustomerSignature:Boolean(input.customerSignDocumentId),checkedInAt:visit.checkedInAt,checkedOutAt:at});let proofId:string|null=null;if(input.photoDocumentId||(policy.locationEnabled&&input.latitude!==undefined)){const proof=await this.repository.createVisitLocation(tx,{organizationId:tenant.organizationId,serviceVisitId:visit.id,kind:'CHECK_OUT',latitude:policy.locationEnabled&&input.latitude!==undefined?new Prisma.Decimal(input.latitude):null,longitude:policy.locationEnabled&&input.longitude!==undefined?new Prisma.Decimal(input.longitude):null,accuracyMeters:policy.locationEnabled&&input.accuracyMeters!==undefined?new Prisma.Decimal(input.accuracyMeters):null,photoDocumentId:input.photoDocumentId??null,capturedAt:at,retainUntil:retentionDate(at,policy.retentionDays)});proofId=proof.id;}await this.repository.checkoutVisit(tx,visit.id,at);const check=await this.repository.createCheckOut(tx,{organizationId:tenant.organizationId,branchId:wo.branchId,workOrderId:command.workOrderId,serviceVisitId:visit.id,technicianId:employeeId,locationProofId:proofId,photoDocumentId:input.photoDocumentId??null,customerSignDocumentId:input.customerSignDocumentId??null,checkedOutAt:at});const route=await this.repository.activeRoute(tx,command.workOrderId,employeeId);if(route)await this.repository.finishRoute(tx,route.id,at);await this.repository.updateTechnicianAvailability(tx,employeeId,'ASSIGNED');await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'WORK_ORDER_OFFLINE_CHECKED_OUT',subjectType:'WorkOrder',subjectId:command.workOrderId,afterJson:{clientCommandId:command.clientCommandId,serviceVisitId:visit.id,checkOutId:check.id,checkedOutAt:at,locationCaptured:policy.locationEnabled&&input.latitude!==undefined,photoProof:Boolean(input.photoDocumentId),customerSignature:Boolean(input.customerSignDocumentId)},ip:actor.ip});return{clientCommandId:command.clientCommandId,workOrderId:command.workOrderId,serviceVisitId:visit.id,checkedOutAt:at.toISOString()};
  }

  private async applyOfflineServiceReport(tx:TransactionClient,tenant:TenantRequestContext,actor:{userId:string;ip:string|null},command:OfflineCommandEnvelope,wo:{status:string},employeeId:string){
    assertServiceReportAllowed(wo.status as WorkOrderState);const input=serviceReportPayload(command);assertServiceReportTimeWindow(new Date(input.arrivalAt),new Date(input.departureAt));const parts=(input.parts as unknown[]).map((item)=>{const part=item&&typeof item==='object'?item as Record<string,unknown>:{};const batches=Array.isArray(part.batches)?part.batches:[];return{organizationId:tenant.organizationId,productId:String(part.productId),qty:new Prisma.Decimal(String(part.qty??'0')),sourceWarehouseId:String(part.sourceWarehouseId),sourceLocationId:typeof part.sourceLocationId==='string'?part.sourceLocationId:null,batchAllocationsJson:batches};});for(const part of parts){const {product}=await this.inventory.validateServicePartSource(tenant.organizationId,{warehouseId:part.sourceWarehouseId,locationId:part.sourceLocationId,productId:part.productId});assertServicePartTracking({productId:part.productId,trackingType:product.trackingType,batchCount:Array.isArray(part.batchAllocationsJson)?part.batchAllocationsJson.length:0});}const row=await this.repository.createServiceReport(tx,{organizationId:tenant.organizationId,workOrderId:command.workOrderId,technicianId:employeeId,arrivalAt:new Date(input.arrivalAt),departureAt:new Date(input.departureAt),workPerformed:input.workPerformed,rootCause:input.rootCause,resolution:input.resolution,beforePhotoDocumentId:input.beforePhotoDocumentId??null,afterPhotoDocumentId:input.afterPhotoDocumentId??null,customerSignDocumentId:input.customerSignDocumentId??null,technicianSignDocumentId:input.technicianSignDocumentId??null,parts});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'SERVICE_REPORT_OFFLINE_CREATED',subjectType:'ServiceReport',subjectId:row.id,afterJson:{clientCommandId:command.clientCommandId,workOrderId:command.workOrderId,technicianId:employeeId,status:row.status,partCount:row.parts.length},ip:actor.ip});return{clientCommandId:command.clientCommandId,serviceReportId:row.id,workOrderId:command.workOrderId,status:row.status};
  }

  private async applyOfflineComplete(tx:TransactionClient,tenant:TenantRequestContext,actor:{userId:string;ip:string|null},command:OfflineCommandEnvelope,wo:{id:string;assetId:string;ticketId:string|null;branchId:string|null;status:string;workOrderNo:string},assignedTechnicianId:string|null){
    const reportId=payloadString(command.payload,'serviceReportId');if(!reportId)throw new AppError(400,'OFFLINE_SYNC_SERVICE_REPORT_REQUIRED','Offline COMPLETE command requires serviceReportId.',{clientCommandId:command.clientCommandId});const assignment=assignedTechnicianId?await this.repository.activeAssignmentTx(tx,command.workOrderId):null;const report=await this.repository.lockServiceReport(tx,tenant.organizationId,command.workOrderId,reportId);const visit=assignedTechnicianId?await this.repository.latestCompletedVisit(tx,command.workOrderId,assignedTechnicianId):null;assertWorkOrderCompletionAllowed({status:wo.status as WorkOrderState,acceptedAssignment:Boolean(assignment?.acceptedAt),reportIsDraft:Boolean(report&&report.status==='DRAFT'),reportTechnicianMatchesAssignment:Boolean(report&&assignedTechnicianId&&report.technicianId===assignedTechnicianId),completedVisitExists:Boolean(visit?.checkedOutAt),customerConfirmed:payloadBoolean(command.payload,'customerConfirmed',false)});assertFieldServiceReportCompletionEvidence({status:wo.status as WorkOrderState,reportStatus:report?.status,completedVisitExists:Boolean(visit?.checkedOutAt),customerConfirmed:payloadBoolean(command.payload,'customerConfirmed',false),partCount:report?await this.repository.countServiceReportParts(tx,report.id):0,linkedPartCount:report?await this.repository.countLinkedServiceReportParts(tx,report.id):0});if(!assignment||!report||!visit||!assignedTechnicianId)throw new AppError(500,'OFFLINE_SYNC_COMPLETION_INVARIANT_INVALID','Offline completion invariant was not satisfied after policy guard.');const parts=await this.repository.serviceReportParts(tx,report.id);const consumed:Array<{productId:string;qty:string;stockTransactionId:string|null}>=[];for(const part of parts){if(part.stockTransactionId)throw new AppError(409,'SERVICE_REPORT_PART_ALREADY_CONSUMED','Service report part already has a stock transaction.');const raw=Array.isArray(part.batchAllocationsJson)?part.batchAllocationsJson:[];const batches=raw.map((r:any)=>({lotNo:String(r.lotNo),qty:new Prisma.Decimal(String(r.qty))}));const ledger=await this.inventory.consumeServicePart(tx,{organizationId:tenant.organizationId,warehouseId:part.sourceWarehouseId,locationId:part.sourceLocationId,productId:part.productId,qty:part.qty,referenceId:report.id,batches});await this.repository.linkPartTransaction(tx,part.id,ledger.id);consumed.push({productId:part.productId,qty:part.qty.toString(),stockTransactionId:ledger.id});}await this.repository.finalizeServiceReport(tx,report.id);await this.repository.verifyVisitCompletion(tx,visit.id);await this.repository.updateWorkOrder(tx,command.workOrderId,{status:'RESOLVED'});await this.repository.updateWorkOrder(tx,command.workOrderId,{status:'CUSTOMER_CONFIRMATION'});const closedAt=new Date(command.occurredAt);await this.repository.updateWorkOrder(tx,command.workOrderId,{status:'CLOSED',closedAt});await this.repository.updateTechnicianAvailability(tx,assignedTechnicianId,'AVAILABLE');if(wo.ticketId){const ticket=await this.repository.lockTicket(tx,tenant.organizationId,wo.branchId,wo.ticketId);if(ticket&&!['RESOLVED','CLOSED','CANCELLED'].includes(ticket.status))await this.repository.updateTicket(tx,ticket.id,{status:'RESOLVED',resolvedAt:closedAt});}await this.assets.recordFieldServiceCompletion(tx,{organizationId:tenant.organizationId,assetId:wo.assetId,workOrderId:command.workOrderId,serviceReportId:report.id,technicianId:assignedTechnicianId,resolution:report.resolution,parts:consumed});await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:'WORK_ORDER_OFFLINE_COMPLETED',subjectType:'WorkOrder',subjectId:command.workOrderId,beforeJson:{status:wo.status,clientCommandId:command.clientCommandId},afterJson:{status:'CLOSED',closedAt,serviceReportId:report.id,serviceVisitId:visit.id,customerConfirmed:true,parts:consumed},ip:actor.ip});await this.events.append(tx,{organizationId:tenant.organizationId,type:'work_order.completed',aggregateType:'WorkOrder',aggregateId:command.workOrderId,payload:{workOrderNo:wo.workOrderNo,assetId:wo.assetId,serviceReportId:report.id,technicianId:assignedTechnicianId,offline:true}});return{clientCommandId:command.clientCommandId,workOrderId:command.workOrderId,status:'CLOSED',closedAt:closedAt.toISOString()};
  }

  private async applyOfflineEvidenceAudit(tx:TransactionClient,tenant:TenantRequestContext,actor:{userId:string;ip:string|null},batch:{clientBatchId:string;deviceId:string},command:OfflineCommandEnvelope,type:OfflineTechnicianCommandType){
    const documentIds=[...payloadStringArray(command.payload,'documentIds'),...payloadStringArray(command.payload,'evidenceDocumentIds')];
    await this.audit.append(tx,{organizationId:tenant.organizationId,actorUserId:actor.userId,action:`WORK_ORDER_OFFLINE_${type}`,subjectType:'WorkOrder',subjectId:command.workOrderId,afterJson:{clientBatchId:batch.clientBatchId,clientCommandId:command.clientCommandId,deviceId:batch.deviceId,occurredAt:command.occurredAt,documentIds,checklist:command.payload.checklist??null,part:command.payload.part??null},ip:actor.ip});
    return{clientCommandId:command.clientCommandId,workOrderId:command.workOrderId,status:'RECORDED',type,documentIds};
  }

}
