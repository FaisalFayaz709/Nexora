import { Prisma, prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class ProcurementRepository {

  createMaterialRequirement(
    tx: TransactionClient,
    data: {
      organizationId: string;
      projectId: string;
      requestedById: string;
      items: Array<{ productId: string; qty: Prisma.Decimal }>;
    },
  ) {
    return tx.materialRequirement.create({
      data: {
        organizationId: data.organizationId,
        projectId: data.projectId,
        requestedById: data.requestedById,
        status: 'DRAFT',
        items: { create: data.items },
      },
      include: { items: true },
    });
  }

  async projectProcurementSummary(organizationId: string, projectId: string) {
    const purchaseOrders = await this.db.purchaseOrder.findMany({
      where: {
        organizationId,
        supplierQuotation: {
          rfq: { purchaseRequest: { projectId } },
        },
        status: { in: ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED'] },
      },
      select: {
        id: true,
        poNo: true,
        status: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            unitPrice: true,
            receiptItems: {
              select: { acceptedQty: true },
            },
          },
        },
      },
    });

    const purchaseRequests = await this.db.purchaseRequest.findMany({
      where: { organizationId, projectId },
      select: { id: true, prNo: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const requirements = await this.db.materialRequirement.findMany({
      where: { organizationId, projectId },
      select: { id: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return { purchaseOrders, purchaseRequests, requirements };
  }

  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new ProcurementRepository(db); }

  listPurchaseRequests(input:{organizationId:string;branchId:string|null;skip:number;take:number}) {
    const where={organizationId:input.organizationId,...(input.branchId?{branchId:input.branchId}:{})};
    return Promise.all([
      this.db.purchaseRequest.findMany({where,orderBy:{createdAt:'desc'},skip:input.skip,take:input.take,include:{items:true}}),
      this.db.purchaseRequest.count({where}),
    ]);
  }
  getPurchaseRequest(organizationId:string,branchId:string|null,id:string){return this.db.purchaseRequest.findFirst({where:{id,organizationId,...(branchId?{branchId}:{})},include:{items:true}});}
  async lockPurchaseRequest(tx:TransactionClient,organizationId:string,id:string){const rows=await tx.$queryRaw<Array<{id:string;organizationId:string;branchId:string;requesterId:string;prNo:string;status:string;approvalRequestId:string|null}>>`SELECT "id","organizationId","branchId","requesterId","prNo","status","approvalRequestId" FROM "PurchaseRequest" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`;return rows[0]??null;}
  createPurchaseRequest(tx:TransactionClient,data:any){return tx.purchaseRequest.create({data,include:{items:true}});}
  replacePurchaseRequestItems(tx:TransactionClient,id:string,items:any[]){return tx.purchaseRequest.update({where:{id},data:{items:{deleteMany:{},create:items}},include:{items:true}});}
  updatePurchaseRequest(tx:TransactionClient,id:string,data:any){return tx.purchaseRequest.update({where:{id},data,include:{items:true}});}
  setPurchaseRequestStatus(tx:TransactionClient,id:string,status:string,data:any={}){return tx.purchaseRequest.update({where:{id},data:{status,...data},include:{items:true}});}

  listRfqs(input:{organizationId:string;skip:number;take:number}) {const where={organizationId:input.organizationId}; return Promise.all([this.db.rFQ.findMany({where,orderBy:{createdAt:'desc'},skip:input.skip,take:input.take}),this.db.rFQ.count({where})]);}
  getRfq(organizationId:string,id:string){return this.db.rFQ.findFirst({where:{id,organizationId},include:{vendors:true,quotations:{include:{items:true}},purchaseRequest:{include:{items:true}}}});}
  createRfq(tx:TransactionClient,data:any){return tx.rFQ.create({data});}
  inviteVendors(tx:TransactionClient,rfqId:string,vendorIds:string[]){return tx.rFQVendor.createMany({data:vendorIds.map(vendorId=>({rfqId,vendorId})),skipDuplicates:true});}
  setRfqStatus(tx:TransactionClient,id:string,status:string,data:any={}){return tx.rFQ.update({where:{id},data:{status,...data}});}

  createQuotation(tx:TransactionClient,data:any){return tx.supplierQuotation.create({data,include:{items:true}});}
  getQuotation(organizationId:string,id:string){return this.db.supplierQuotation.findFirst({where:{id,organizationId},include:{items:true,rfq:true}});}
  selectQuotation(tx:TransactionClient,id:string){return tx.supplierQuotation.update({where:{id},data:{status:'SELECTED',selectedAt:new Date()},include:{items:true,rfq:true}});}
  rejectOtherQuotations(tx:TransactionClient,rfqId:string,selectedId:string){return tx.supplierQuotation.updateMany({where:{rfqId,id:{not:selectedId},status:{in:['SUBMITTED','VALID']}},data:{status:'REJECTED'}});}
  countSelectedQuotations(organizationId:string,rfqId:string,exceptId?:string){return this.db.supplierQuotation.count({where:{organizationId,rfqId,status:'SELECTED',...(exceptId?{id:{not:exceptId}}:{})}});}
  quotationComparison(organizationId:string,rfqId:string){return this.db.supplierQuotation.findMany({where:{organizationId,rfqId},include:{items:true},orderBy:[{total:'asc'},{createdAt:'asc'}]});}

  listPurchaseOrders(input:{organizationId:string;branchId:string|null;skip:number;take:number}){const where={organizationId:input.organizationId,...(input.branchId?{branchId:input.branchId}:{})};return Promise.all([this.db.purchaseOrder.findMany({where,orderBy:{createdAt:'desc'},skip:input.skip,take:input.take,include:{items:true}}),this.db.purchaseOrder.count({where})]);}
  getPurchaseOrder(organizationId:string,branchId:string|null,id:string){return this.db.purchaseOrder.findFirst({where:{id,organizationId,...(branchId?{branchId}:{})},include:{items:true}});}
  createPurchaseOrder(tx:TransactionClient,data:any){return tx.purchaseOrder.create({data,include:{items:true}});}
  setPurchaseOrderStatus(tx:TransactionClient,id:string,status:string,data:any={}){return tx.purchaseOrder.update({where:{id},data:{status,...data},include:{items:true}});}
  countReceipts(organizationId:string,purchaseOrderId:string){return this.db.goodsReceipt.count({where:{organizationId,purchaseOrderId}});}

  async lockPurchaseOrder(tx:TransactionClient,organizationId:string,id:string){const rows=await tx.$queryRaw<Array<{id:string;organizationId:string;branchId:string;vendorId:string;poNo:string;status:string}>>`SELECT "id","organizationId","branchId","vendorId","poNo","status" FROM "PurchaseOrder" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`;return rows[0]??null;}
  async lockPurchaseOrderItem(tx:TransactionClient,poId:string,itemId:string){const rows=await tx.$queryRaw<Array<{id:string;purchaseOrderId:string;productId:string;orderedQty:Prisma.Decimal;receivedQty:Prisma.Decimal;unitPrice:Prisma.Decimal}>>`SELECT "id","purchaseOrderId","productId","orderedQty","receivedQty","unitPrice" FROM "PurchaseOrderItem" WHERE "id"=${itemId}::uuid AND "purchaseOrderId"=${poId}::uuid FOR UPDATE`;return rows[0]??null;}
  incrementPoReceived(tx:TransactionClient,id:string,qty:Prisma.Decimal){return tx.purchaseOrderItem.update({where:{id},data:{receivedQty:{increment:qty}}});}
  poItems(tx:TransactionClient,poId:string){return tx.purchaseOrderItem.findMany({where:{purchaseOrderId:poId}});}
  createGoodsReceipt(tx:TransactionClient,data:any){return tx.goodsReceipt.create({data,include:{items:true}});}
  listGoodsReceipts(input:{organizationId:string;branchId:string|null;skip:number;take:number}){const where:any={organizationId:input.organizationId,...(input.branchId?{purchaseOrder:{branchId:input.branchId}}:{})};return Promise.all([this.db.goodsReceipt.findMany({where,orderBy:{receivedAt:'desc'},skip:input.skip,take:input.take,include:{items:true}}),this.db.goodsReceipt.count({where})]);}
  getGoodsReceipt(organizationId:string,branchId:string|null,id:string){return this.db.goodsReceipt.findFirst({where:{id,organizationId,...(branchId?{purchaseOrder:{branchId}}:{})},include:{items:true,inspections:true}});}
  createInspection(tx:TransactionClient,data:any){return tx.qualityInspection.create({data});}
  setGoodsReceiptStatus(tx:TransactionClient,id:string,status:string){return tx.goodsReceipt.update({where:{id},data:{status},include:{items:true,inspections:true}});}


  async supplierInvoiceSourceSnapshot(organizationId:string,purchaseOrderId:string,goodsReceiptId:string){
    const purchaseOrder=await this.db.purchaseOrder.findFirst({
      where:{id:purchaseOrderId,organizationId},
      select:{id:true,organizationId:true,vendorId:true,status:true,total:true,items:{select:{id:true,productId:true,orderedQty:true,receivedQty:true,unitPrice:true,tax:true},orderBy:{id:'asc'}}},
    });
    const goodsReceipt=await this.db.goodsReceipt.findFirst({
      where:{id:goodsReceiptId,organizationId,purchaseOrderId},
      select:{id:true,status:true,items:{select:{poItemId:true,productId:true,receivedQty:true,acceptedQty:true,damagedQty:true},orderBy:{id:'asc'}}},
    });
    return {purchaseOrder,goodsReceipt};
  }

  findIdempotency(organizationId:string,route:string,key:string){return this.db.idempotencyKey.findUnique({where:{organizationId_route_key:{organizationId,route,key}},select:{requestHash:true,responseJson:true}});}

  async claimIdempotency(tx:TransactionClient,input:{organizationId:string;route:string;key:string;requestHash:string;expiresAt:Date}){
    const inserted=await tx.$executeRaw`INSERT INTO "IdempotencyKey" ("id","organizationId","key","route","requestHash","expiresAt","createdAt") VALUES (gen_random_uuid(),${input.organizationId}::uuid,${input.key},${input.route},${input.requestHash},${input.expiresAt},CURRENT_TIMESTAMP) ON CONFLICT ("organizationId","route","key") DO NOTHING`;
    if(inserted===1)return {claimed:true,responseJson:null,requestHash:input.requestHash};
    const rows=await tx.$queryRaw<Array<{requestHash:string;responseJson:unknown|null}>>`SELECT "requestHash","responseJson" FROM "IdempotencyKey" WHERE "organizationId"=${input.organizationId}::uuid AND "route"=${input.route} AND "key"=${input.key} FOR UPDATE`;
    return {claimed:false,responseJson:rows[0]?.responseJson??null,requestHash:rows[0]?.requestHash??''};
  }
  completeIdempotency(tx:TransactionClient,organizationId:string,route:string,key:string,responseJson:unknown){return tx.idempotencyKey.update({where:{organizationId_route_key:{organizationId,route,key}},data:{responseJson:responseJson as never}});}
}
