import { FinanceResourceCommandPage } from '@/modules/finance/finance-command-page';

export default function Page({ params }: { params: { id: string } }) {
  return <FinanceResourceCommandPage resourceKey="journal-entries" commandKey="post-journal-entry" recordId={params.id} />;
}
