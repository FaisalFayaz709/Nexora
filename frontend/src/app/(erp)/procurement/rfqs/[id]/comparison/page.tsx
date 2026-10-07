import { RfqComparisonPanel } from '@/modules/procurement/rfq-comparison-panel';

export default function Page({ params }: { params: { id: string } }) {
  return <RfqComparisonPanel rfqId={params.id} />;
}
