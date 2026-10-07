import { prisma, type TransactionClient } from '@nexora/database';
type Db=typeof prisma|TransactionClient;
const select={id:true,employeeNo:true,name:true,branchId:true,departmentId:true,userId:true,managerId:true,jobTitle:true,joiningDate:true,employmentType:true,baseSalary:true,status:true} as const;
export class EmployeeRepository{
 constructor(private readonly db:Db=prisma){} withDb(db:TransactionClient){return new EmployeeRepository(db);}
 async list(input:{organizationId:string;branchScopeId:string|null;branchId?:string;departmentId?:string;skip:number;take:number}){const where={organizationId:input.organizationId,...(input.branchScopeId?{branchId:input.branchScopeId}:input.branchId?{branchId:input.branchId}:{}),...(input.departmentId?{departmentId:input.departmentId}:{})};const [rows,total]=await Promise.all([this.db.employee.findMany({where,orderBy:[{name:'asc'},{id:'asc'}],skip:input.skip,take:input.take,select}),this.db.employee.count({where})]);return {rows,total};}
 get(organizationId:string,branchScopeId:string|null,id:string){return this.db.employee.findFirst({where:{id,organizationId,...(branchScopeId?{branchId:branchScopeId}:{})},select});}
 branchExists(organizationId:string,branchId:string){return this.db.branch.count({where:{id:branchId,organizationId}}).then(c=>c===1);}
 departmentExists(organizationId:string,branchId:string,departmentId:string){return this.db.department.count({where:{id:departmentId,organizationId,branchId}}).then(c=>c===1);}
 employeeBelongsToOrganization(organizationId:string,id:string){return this.db.employee.count({where:{id,organizationId}}).then(c=>c===1);}
 employeeForOrganization(organizationId:string,id:string){return this.db.employee.findFirst({where:{id,organizationId},select:{id:true,organizationId:true,branchId:true,userId:true,status:true,name:true}});}
 employeeUser(organizationId:string,id:string){return this.db.employee.findFirst({where:{id,organizationId},select:{userId:true}});}
 findByUser(organizationId:string,userId:string){return this.db.employee.findFirst({where:{organizationId,userId,status:'ACTIVE'},select:{id:true,organizationId:true,branchId:true,userId:true,status:true,name:true}});}
 create(data:any){return this.db.employee.create({data,select});}
 async updateScoped(organizationId:string,branchScopeId:string|null,id:string,data:any){const where={id,organizationId,...(branchScopeId?{branchId:branchScopeId}:{})};await this.db.employee.updateMany({where,data});return this.db.employee.findFirst({where,select:{...select,organizationId:true}});}
}
