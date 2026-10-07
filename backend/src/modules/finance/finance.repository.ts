import { Prisma, prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class FinanceRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new FinanceRepository(db); }

  async ensureDefaultAccounts(tx: TransactionClient, organizationId: string) {
    const rows = [
      ['1000','Cash / Bank','ASSET'], ['1100','Accounts Receivable','ASSET'],
      ['2000','Accounts Payable','LIABILITY'], ['2100','Tax Payable','LIABILITY'],
      ['4000','Revenue','REVENUE'], ['5000','Operating Expense','EXPENSE'],
    ] as const;
    const result: Record<string,string> = {};
    for (const [code,name,type] of rows) {
      const account = await tx.account.upsert({
        where:{ organizationId_code:{ organizationId, code }},
        update:{ active:true },
        create:{ organizationId, code, name, type, active:true },
      });
      result[code] = account.id;
    }
    return result;
  }

  async ensureCommercialAccounts(tx: TransactionClient, organizationId: string) {
    const accounts = await this.ensureDefaultAccounts(tx, organizationId);
    const extras = [
      ['1200', 'Inventory Asset', 'ASSET'],
      ['2200', 'Withholding Tax Payable', 'LIABILITY'],
      ['2300', 'Bank Clearing', 'LIABILITY'],
    ] as const;
    for (const [code, name, type] of extras) {
      const row = await tx.account.upsert({
        where: { organizationId_code: { organizationId, code } },
        update: { active: true },
        create: { organizationId, code, name, type, active: true },
      });
      accounts[code] = row.id;
    }
    return accounts;
  }


  async ensureOpenPeriod(tx: TransactionClient, organizationId: string, date: Date) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth()+1, 0));
    return tx.financialPeriod.upsert({
      where:{ organizationId_startDate_endDate:{ organizationId, startDate:start, endDate:end }},
      update:{},
      create:{ organizationId, startDate:start, endDate:end, status:'OPEN' },
    });
  }

  listCustomerInvoices(organizationId:string, q:any, skip:number, take:number){
    const where:any={ organizationId, ...(q.status?{status:q.status}:{}), ...(q.customerId?{customerId:q.customerId}:{}), ...(q.projectId?{projectId:q.projectId}:{}), ...(q.dueBefore?{dueDate:{lte:new Date(q.dueBefore)}}:{}) };
    return Promise.all([
      this.db.customerInvoice.findMany({where,orderBy:[{issueDate:'desc'},{id:'desc'}],skip,take,include:{items:true}}),
      this.db.customerInvoice.count({where}),
    ]).then(([rows,total])=>({rows,total}));
  }
  getCustomerInvoice(organizationId:string,id:string){return this.db.customerInvoice.findFirst({where:{id,organizationId},include:{items:true,creditNotes:true}});}
  async lockCustomerInvoice(tx:TransactionClient, organizationId:string, id:string){
    const rows=await tx.$queryRaw<Array<any>>`SELECT * FROM "CustomerInvoice" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`;
    return rows[0]??null;
  }
  createCustomerInvoice(tx:TransactionClient,data:any,items:any[]){return tx.customerInvoice.create({data:{...data,items:{create:items}},include:{items:true}});}
  replaceCustomerItems(tx:TransactionClient,invoiceId:string,items:any[]){return tx.customerInvoiceItem.deleteMany({where:{invoiceId}}).then(()=>tx.customerInvoiceItem.createMany({data:items}));}
  updateCustomerInvoice(tx:TransactionClient,id:string,data:any){return tx.customerInvoice.update({where:{id},data,include:{items:true}});}

  listSupplierInvoices(organizationId:string,q:any,skip:number,take:number){
    const where:any={ organizationId, ...(q.status?{status:q.status}:{}), ...(q.matchStatus?{matchStatus:q.matchStatus}:{}), ...(q.vendorId?{vendorId:q.vendorId}:{}), ...(q.purchaseOrderId?{purchaseOrderId:q.purchaseOrderId}:{}), ...(q.goodsReceiptId?{goodsReceiptId:q.goodsReceiptId}:{}) };
    return Promise.all([
      this.db.supplierInvoice.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip,take,include:{items:true}}),
      this.db.supplierInvoice.count({where}),
    ]).then(([rows,total])=>({rows,total}));
  }
  getSupplierInvoice(organizationId:string,id:string){return this.db.supplierInvoice.findFirst({where:{id,organizationId},include:{items:true,debitNotes:true}});}
  async lockSupplierInvoice(tx:TransactionClient, organizationId:string, id:string){
    const rows=await tx.$queryRaw<Array<any>>`SELECT * FROM "SupplierInvoice" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`;
    return rows[0]??null;
  }
  createSupplierInvoice(tx:TransactionClient,data:any,items:any[]){return tx.supplierInvoice.create({data:{...data,items:{create:items}},include:{items:true}});}
  replaceSupplierItems(tx:TransactionClient,invoiceId:string,items:any[]){return tx.supplierInvoiceItem.deleteMany({where:{supplierInvoiceId:invoiceId}}).then(()=>tx.supplierInvoiceItem.createMany({data:items}));}
  updateSupplierInvoice(tx:TransactionClient,id:string,data:any){return tx.supplierInvoice.update({where:{id},data,include:{items:true}});}
  supplierInvoiceItems(tx:TransactionClient,supplierInvoiceId:string){return tx.supplierInvoiceItem.findMany({where:{supplierInvoiceId},orderBy:{id:'asc'}});}

  listExpenses(organizationId:string,q:any,skip:number,take:number){
    const where:any={ organizationId, ...(q.status?{status:q.status}:{}), ...(q.employeeId?{employeeId:q.employeeId}:{}), ...(q.projectId?{projectId:q.projectId}:{}) };
    return Promise.all([
      this.db.expense.findMany({where,orderBy:[{incurredAt:'desc'},{id:'desc'}],skip,take,include:{items:true}}),
      this.db.expense.count({where}),
    ]).then(([rows,total])=>({rows,total}));
  }
  getExpense(organizationId:string,id:string){return this.db.expense.findFirst({where:{id,organizationId},include:{items:true}});}
  async lockExpense(tx:TransactionClient, organizationId:string, id:string){
    const rows=await tx.$queryRaw<Array<any>>`SELECT * FROM "Expense" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`;
    return rows[0]??null;
  }
  createExpense(tx:TransactionClient,data:any,items:any[]){return tx.expense.create({data:{...data,items:{create:items}},include:{items:true}});}
  replaceExpenseItems(tx:TransactionClient,expenseId:string,items:any[]){return tx.expenseItem.deleteMany({where:{expenseId}}).then(()=>tx.expenseItem.createMany({data:items}));}
  updateExpense(tx:TransactionClient,id:string,data:any){return tx.expense.update({where:{id},data,include:{items:true}});}

  listPayments(organizationId:string,q:any,skip:number,take:number){
    const where:any={ organizationId, ...(q.direction?{direction:q.direction}:{}), ...(q.partyType?{partyType:q.partyType}:{}), ...(q.partyId?{partyId:q.partyId}:{}), ...(q.status?{status:q.status}:{}) };
    return Promise.all([
      this.db.payment.findMany({where,orderBy:[{paidAt:'desc'},{id:'desc'}],skip,take,include:{allocations:true}}),
      this.db.payment.count({where}),
    ]).then(([rows,total])=>({rows,total}));
  }
  createPayment(tx:TransactionClient,data:any,allocations:any[]){return tx.payment.create({data:{...data,allocations:{create:allocations}},include:{allocations:true}});}
  linkPaymentJournal(tx:TransactionClient, id:string, journalEntryId:string){return tx.payment.update({where:{id},data:{journalEntryId}});}

  listAccounts(organizationId:string,q:any,skip:number,take:number){
    const where:any={ organizationId, ...(q.type?{type:q.type}:{}), ...(q.active!==undefined?{active:q.active}:{}) };
    return Promise.all([
      this.db.account.findMany({where,orderBy:[{code:'asc'}],skip,take}),
      this.db.account.count({where}),
    ]).then(([rows,total])=>({rows,total}));
  }

  createJournalEntry(tx:TransactionClient,data:any,lines:any[]){return tx.journalEntry.create({data:{...data,lines:{create:lines}},include:{lines:true}});}
  async lockJournalEntry(tx:TransactionClient,organizationId:string,id:string){
    const rows=await tx.$queryRaw<Array<any>>`SELECT * FROM "JournalEntry" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`;
    return rows[0]??null;
  }
  getJournalLines(tx:TransactionClient,journalEntryId:string){return tx.journalLine.findMany({where:{journalEntryId}});}
  updateJournalEntry(tx:TransactionClient,id:string,data:any){return tx.journalEntry.update({where:{id},data,include:{lines:true}});}

  idempotency(tx:TransactionClient, organizationId:string, route:string, key:string){return tx.idempotencyKey.findUnique({where:{organizationId_route_key:{organizationId,route,key}},select:{requestHash:true,responseJson:true}});}
  storeIdempotency(tx:TransactionClient, data:{organizationId:string;key:string;route:string;requestHash:string;responseJson:unknown;expiresAt:Date}){return tx.idempotencyKey.create({data:data as never});}

  arAging(organizationId:string, asOf:Date){return this.db.customerInvoice.findMany({where:{organizationId,status:{in:['POSTED','SENT','PARTIALLY_PAID','OVERDUE']},balance:{gt:0},dueDate:{lte:asOf}},orderBy:{dueDate:'asc'}});}
  apAging(organizationId:string, asOf:Date){return this.db.supplierInvoice.findMany({where:{organizationId,status:{in:['POSTED','PARTIALLY_PAID']},balance:{gt:0}},orderBy:{createdAt:'asc'}});}

  async projectCostSummary(organizationId: string, projectId: string) {
    const [expenses, invoices] = await Promise.all([
      this.db.expense.findMany({
        where: { organizationId, projectId, status: { in: ['APPROVED', 'POSTED', 'PAID'] } },
        select: { total: true },
      }),
      this.db.customerInvoice.findMany({
        where: { organizationId, projectId, status: { in: ['POSTED', 'SENT', 'PARTIALLY_PAID', 'PAID'] } },
        select: { total: true },
      }),
    ]);

    const actualOtherCost = expenses.reduce(
      (sum, row) => sum.add(row.total),
      new Prisma.Decimal(0),
    );
    const billedRevenue = invoices.reduce(
      (sum, row) => sum.add(row.total),
      new Prisma.Decimal(0),
    );
    return { actualOtherCost, billedRevenue };
  }
}
