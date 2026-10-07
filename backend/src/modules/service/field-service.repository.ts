import { Prisma, prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class FieldServiceRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new FieldServiceRepository(db); }

  ensureSlaPolicy(tx: TransactionClient, organizationId: string, priority: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL') {
    const defaults = {
      LOW: { responseMinutes: 480, resolutionMinutes: 2880 },
      MEDIUM: { responseMinutes: 240, resolutionMinutes: 1440 },
      HIGH: { responseMinutes: 60, resolutionMinutes: 480 },
      CRITICAL: { responseMinutes: 30, resolutionMinutes: 240 },
    } as const;
    const rule = defaults[priority];
    return tx.slaPolicy.upsert({
      where: { organizationId_priority: { organizationId, priority } }, update: {},
      create: { organizationId, name: `${priority} Default SLA`, priority, responseMinutes: rule.responseMinutes, resolutionMinutes: rule.resolutionMinutes },
    });
  }

  async listTickets(input: { organizationId:string; branchId:string|null; status?:string; priority?:string; customerId?:string; siteId?:string; assetId?:string; assignedToId?:string; skip:number; take:number }) {
    const where = { organizationId: input.organizationId, ...(input.branchId?{branchId:input.branchId}:{}), ...(input.status?{status:input.status}:{}), ...(input.priority?{priority:input.priority}:{}), ...(input.customerId?{customerId:input.customerId}:{}), ...(input.siteId?{siteId:input.siteId}:{}), ...(input.assetId?{assetId:input.assetId}:{}), ...(input.assignedToId?{assignedToId:input.assignedToId}:{}) };
    const [rows,total] = await Promise.all([
      this.db.ticket.findMany({ where, orderBy:[{createdAt:'desc'},{id:'desc'}], skip:input.skip, take:input.take, include:{slaPolicy:true} }),
      this.db.ticket.count({where}),
    ]);
    return {rows,total};
  }

  getTicket(organizationId:string, branchId:string|null, id:string) {
    return this.db.ticket.findFirst({
      where:{id,organizationId,...(branchId?{branchId}:{})},
      include:{slaPolicy:true,comments:{orderBy:{createdAt:'asc'}},workOrders:{orderBy:{createdAt:'desc'},select:{id:true,workOrderNo:true,status:true,scheduledAt:true,createdAt:true}}},
    });
  }

  async lockTicket(tx:TransactionClient, organizationId:string, branchId:string|null, id:string) {
    const rows = await tx.$queryRaw<Array<{id:string;organizationId:string;branchId:string|null;ticketNo:string;customerId:string;siteId:string;assetId:string;category:string;priority:string;subject:string;description:string;status:string;openedById:string;assignedToId:string|null;slaPolicyId:string;responseDueAt:Date;resolutionDueAt:Date;firstRespondedAt:Date|null;resolvedAt:Date|null;closedAt:Date|null;createdAt:Date}>>`
      SELECT "id","organizationId","branchId","ticketNo","customerId","siteId","assetId","category","priority","subject","description","status","openedById","assignedToId","slaPolicyId","responseDueAt","resolutionDueAt","firstRespondedAt","resolvedAt","closedAt","createdAt"
      FROM "Ticket" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid AND (${branchId}::uuid IS NULL OR "branchId"=${branchId}::uuid) FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  createTicket(tx:TransactionClient,data:any){return tx.ticket.create({data:{...data,status:'OPEN'},include:{slaPolicy:true}});}
  updateTicket(tx:TransactionClient,id:string,data:Record<string,unknown>){return tx.ticket.update({where:{id},data,include:{slaPolicy:true}});}

  async listWorkOrders(input:{organizationId:string;branchId:string|null;status?:string;priority?:string;ticketId?:string;assetId?:string;projectId?:string;technicianId?:string;skip:number;take:number}){
    const where={organizationId:input.organizationId,...(input.branchId?{branchId:input.branchId}:{}),...(input.status?{status:input.status}:{}),...(input.priority?{priority:input.priority}:{}),...(input.ticketId?{ticketId:input.ticketId}:{}),...(input.assetId?{assetId:input.assetId}:{}),...(input.projectId?{projectId:input.projectId}:{}),...(input.technicianId?{assignments:{some:{technicianId:input.technicianId,unassignedAt:null}}}:{})};
    const [rows,total]=await Promise.all([
      this.db.workOrder.findMany({where,orderBy:[{scheduledAt:'asc'},{createdAt:'desc'}],skip:input.skip,take:input.take,include:{assignments:{where:{unassignedAt:null},orderBy:{assignedAt:'desc'},take:1}}}),
      this.db.workOrder.count({where}),
    ]);
    return {rows,total};
  }

  getWorkOrder(organizationId:string,branchId:string|null,id:string){return this.db.workOrder.findFirst({where:{id,organizationId,...(branchId?{branchId}:{})},include:{ticket:{include:{slaPolicy:true}},assignments:{orderBy:{assignedAt:'desc'}},serviceReports:{orderBy:{createdAt:'desc'},include:{parts:true}},serviceVisits:{orderBy:{checkedInAt:'desc'},include:{checkIn:true,checkOut:true}}}});}

  async lockWorkOrder(tx:TransactionClient,organizationId:string,branchId:string|null,id:string){
    const rows=await tx.$queryRaw<Array<{id:string;organizationId:string;branchId:string|null;workOrderNo:string;ticketId:string|null;assetId:string;projectId:string|null;status:string;scheduledAt:Date|null;priority:string;closedAt:Date|null}>>`
      SELECT "id","organizationId","branchId","workOrderNo","ticketId","assetId","projectId","status","scheduledAt","priority","closedAt"
      FROM "WorkOrder" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid AND (${branchId}::uuid IS NULL OR "branchId"=${branchId}::uuid) FOR UPDATE
    `;
    return rows[0]??null;
  }

  createWorkOrder(tx:TransactionClient,data:any){return tx.workOrder.create({data:{...data,status:'NEW'}});}
  updateWorkOrder(tx:TransactionClient,id:string,data:Record<string,unknown>){return tx.workOrder.update({where:{id},data});}
  activeAssignment(workOrderId:string){return this.db.workOrderAssignment.findFirst({where:{workOrderId,unassignedAt:null},orderBy:{assignedAt:'desc'}});}
  activeAssignmentTx(tx:TransactionClient,workOrderId:string){return tx.workOrderAssignment.findFirst({where:{workOrderId,unassignedAt:null},orderBy:{assignedAt:'desc'}});}
  closeAssignments(tx:TransactionClient,workOrderId:string){return tx.workOrderAssignment.updateMany({where:{workOrderId,unassignedAt:null},data:{unassignedAt:new Date()}});}
  createAssignment(tx:TransactionClient,data:{organizationId:string;workOrderId:string;technicianId:string}){return tx.workOrderAssignment.create({data});}
  acceptAssignment(tx:TransactionClient,id:string){return tx.workOrderAssignment.update({where:{id},data:{acceptedAt:new Date()}});}
  upsertTechnicianProfile(tx:TransactionClient,data:{employeeId:string;organizationId:string;homeBranchId:string;availabilityStatus:string}){return tx.technicianProfile.upsert({where:{employeeId:data.employeeId},update:{availabilityStatus:data.availabilityStatus},create:data});}
  updateTechnicianAvailability(tx:TransactionClient,employeeId:string,availabilityStatus:string){return tx.technicianProfile.update({where:{employeeId},data:{availabilityStatus}});}

  createServiceReport(tx:TransactionClient,data:any){return tx.serviceReport.create({data:{organizationId:data.organizationId,workOrderId:data.workOrderId,technicianId:data.technicianId,arrivalAt:data.arrivalAt,departureAt:data.departureAt,workPerformed:data.workPerformed,rootCause:data.rootCause,resolution:data.resolution,beforePhotoDocumentId:data.beforePhotoDocumentId,afterPhotoDocumentId:data.afterPhotoDocumentId,customerSignDocumentId:data.customerSignDocumentId,technicianSignDocumentId:data.technicianSignDocumentId,status:'DRAFT',parts:{create:data.parts.map((part:any)=>({organizationId:part.organizationId,productId:part.productId,qty:part.qty,sourceWarehouseId:part.sourceWarehouseId,sourceLocationId:part.sourceLocationId,batchAllocationsJson:part.batchAllocationsJson as never}))}},include:{parts:true}});}

  async lockServiceReport(tx:TransactionClient,organizationId:string,workOrderId:string,reportId:string){
    const rows=await tx.$queryRaw<Array<{id:string;organizationId:string;workOrderId:string;technicianId:string;arrivalAt:Date;departureAt:Date;workPerformed:string;rootCause:string;resolution:string;status:string;customerSignDocumentId:string|null}>>`
      SELECT "id","organizationId","workOrderId","technicianId","arrivalAt","departureAt","workPerformed","rootCause","resolution","status","customerSignDocumentId"
      FROM "ServiceReport" WHERE "id"=${reportId}::uuid AND "organizationId"=${organizationId}::uuid AND "workOrderId"=${workOrderId}::uuid FOR UPDATE
    `; return rows[0]??null;
  }
  serviceReportParts(tx:TransactionClient,serviceReportId:string){return tx.serviceReportPart.findMany({where:{serviceReportId},orderBy:{id:'asc'}});}
  countServiceReportParts(tx:TransactionClient,serviceReportId:string){return tx.serviceReportPart.count({where:{serviceReportId}});}
  countLinkedServiceReportParts(tx:TransactionClient,serviceReportId:string){return tx.serviceReportPart.count({where:{serviceReportId,stockTransactionId:{not:null}}});}
  linkPartTransaction(tx:TransactionClient,partId:string,stockTransactionId:string){return tx.serviceReportPart.update({where:{id:partId},data:{stockTransactionId}});}
  finalizeServiceReport(tx:TransactionClient,reportId:string){return tx.serviceReport.update({where:{id:reportId},data:{status:'FINAL',finalizedAt:new Date()}});}

  activeVisit(tx:TransactionClient,workOrderId:string,technicianId:string){return tx.serviceVisit.findFirst({where:{workOrderId,technicianId,checkedOutAt:null},orderBy:{checkedInAt:'desc'}});}
  latestCompletedVisit(tx:TransactionClient,workOrderId:string,technicianId:string){return tx.serviceVisit.findFirst({where:{workOrderId,technicianId,checkedOutAt:{not:null}},orderBy:{checkedOutAt:'desc'}});}
  createVisit(tx:TransactionClient,data:any){return tx.serviceVisit.create({data});}
  createVisitLocation(tx:TransactionClient,data:any){return tx.serviceVisitLocation.create({data});}
  createCheckIn(tx:TransactionClient,data:any){return tx.workOrderCheckIn.create({data});}
  createRoute(tx:TransactionClient,data:any){return tx.technicianRoute.create({data:{...data,status:'ACTIVE'}});}
  activeRoute(tx:TransactionClient,workOrderId:string,technicianId:string){return tx.technicianRoute.findFirst({where:{workOrderId,technicianId,status:'ACTIVE'},orderBy:{startedAt:'desc'}});}
  createLocationPing(tx:TransactionClient,data:any){return tx.technicianLocationPing.create({data});}
  checkoutVisit(tx:TransactionClient,visitId:string,checkedOutAt:Date){return tx.serviceVisit.update({where:{id:visitId},data:{checkedOutAt}});}
  createCheckOut(tx:TransactionClient,data:any){return tx.workOrderCheckOut.create({data});}
  finishRoute(tx:TransactionClient,routeId:string,endedAt:Date){return tx.technicianRoute.update({where:{id:routeId},data:{endedAt,status:'COMPLETED'}});}
  verifyVisitCompletion(tx:TransactionClient,visitId:string){return tx.serviceVisit.update({where:{id:visitId},data:{completionVerifiedAt:new Date()}});}
  purgeExpiredLocationData(tx:TransactionClient,organizationId:string,now:Date){return Promise.all([
    tx.technicianLocationPing.deleteMany({where:{organizationId,retainUntil:{lt:now}}}),
    tx.serviceVisitLocation.deleteMany({where:{organizationId,retainUntil:{lt:now},checkIn:null,checkOut:null}}),
  ]);}

  findOfflineIdempotency(tx:TransactionClient,organizationId:string,route:string,key:string){
    return tx.idempotencyKey.findUnique({where:{organizationId_route_key:{organizationId,route,key}}});
  }
  createOfflineIdempotency(tx:TransactionClient,data:{organizationId:string;route:string;key:string;requestHash:string;expiresAt:Date}){
    return tx.idempotencyKey.create({data});
  }
  storeOfflineIdempotencyResponse(tx:TransactionClient,organizationId:string,route:string,key:string,responseJson:unknown){
    return tx.idempotencyKey.update({where:{organizationId_route_key:{organizationId,route,key}},data:{responseJson:responseJson as never}});
  }

}
