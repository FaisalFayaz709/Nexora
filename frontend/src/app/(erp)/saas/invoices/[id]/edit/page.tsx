import { PlatformResourceFormPage } from '@/modules/platform/platform-resource-form-page';
import { getPlatformResourceConfig } from '@/modules/platform/platform-resource-config';
export default function Page({ params }: { params: { id: string } }) { return <PlatformResourceFormPage resource={getPlatformResourceConfig('saas-invoices')} mode="edit" recordId={params.id} />; }
