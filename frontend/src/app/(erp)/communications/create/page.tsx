import { PlatformResourceFormPage } from '@/modules/platform/platform-resource-form-page';
import { getPlatformResourceConfig } from '@/modules/platform/platform-resource-config';

export default function Page() {
  return <PlatformResourceFormPage resource={getPlatformResourceConfig('communications')} mode="create" />;
}
