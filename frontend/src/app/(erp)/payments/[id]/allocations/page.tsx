import { FinanceScopedCommandPage } from '@/modules/finance/finance-command-page';

export default function Page({ params }: { params: { id: string } }) {
  return <FinanceScopedCommandPage surfaceKey="payment-allocations" recordId={params.id} />;
}
