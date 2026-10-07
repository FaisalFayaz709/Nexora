import { EntityList } from '@/modules/masters/entity-list';
export default function Page() { return <EntityList title="Quotations" endpoint="/quotations" columns={[{key:'id',label:'ID'},{key:'status',label:'Status'},{key:'createdAt',label:'Created'}]} />; }
