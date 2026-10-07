import { prisma,type TransactionClient } from '@nexora/database';
type Db=typeof prisma|TransactionClient;const select={id:true,customerId:true,code:true,name:true,addressId:true} as const;
export class CustomerSiteRepository{constructor(private readonly db:Db=prisma){}withDb(db:TransactionClient){return new CustomerSiteRepository(db);}async list(organizationId:string,customerId:string|undefined,skip:number,take:number){const where={organizationId,...(customerId?{customerId}:{})};const[rows,total]=await Promise.all([this.db.customerSite.findMany({where,orderBy:[{name:'asc'},{id:'asc'}],skip,take,select}),this.db.customerSite.count({where})]);return{rows,total};}get(organizationId:string,id:string){return this.db.customerSite.findFirst({where:{id,organizationId},select});}customerExists(organizationId:string,customerId:string){return this.db.customer.count({where:{id:customerId,organizationId}}).then(c=>c===1);}areaForSite(organizationId:string,siteId:string,areaId:string){
  return this.db.siteArea.findFirst({
    where:{
      id:areaId,
      building:{
        customerSite:{
          id:siteId,
          organizationId,
        },
      },
    },
    select:{id:true,buildingId:true,name:true,areaType:true},
  });
}
create(data:any){return this.db.customerSite.create({data,select});}async updateScoped(organizationId:string,id:string,data:any){await this.db.customerSite.updateMany({where:{id,organizationId},data});return this.db.customerSite.findFirst({where:{id,organizationId},select:{...select,organizationId:true}});} siteAssets(organizationId:string,siteId:string){return this.db.asset.findMany({where:{organizationId,siteId},orderBy:{assetNo:'asc'},take:500});}}
