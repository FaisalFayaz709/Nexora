'use client';
import { EntityList } from '../masters/entity-list';
export function ProcurementList({title,endpoint,columns}:{title:string;endpoint:string;columns:Array<{key:string;label:string}>}){
 return <EntityList title={title} endpoint={endpoint} columns={columns} detailRouteBase={`/procurement/${endpoint.replace(/^\//,'')}`} createRoute={`/procurement/${endpoint.replace(/^\//,'')}/create`} />;
}
