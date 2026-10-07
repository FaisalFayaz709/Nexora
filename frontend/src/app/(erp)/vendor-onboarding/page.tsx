import { EntityList } from '@/modules/masters/entity-list';

export default function VendorOnboardingPage() {
  return (
    <>
      <EntityList
        title="Vendor Onboarding"
        endpoint="/vendor-onboarding/requests"
        columns={[
          { key: 'vendorId', label: 'Vendor' },
          { key: 'status', label: 'Status' },
          { key: 'riskScore', label: 'Risk Score' },
          { key: 'riskRating', label: 'Risk Rating' },
          { key: 'approvalRequestId', label: 'Approval' },
        ]}
      />
    </>
  );
}
