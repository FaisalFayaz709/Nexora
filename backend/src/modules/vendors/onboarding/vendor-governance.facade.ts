import { AppError } from '../../../core/http/errors.js';
import { VendorOnboardingRepository } from './vendor-onboarding.repository.js';

/** Public procurement/finance boundary for vendor eligibility. */
export class VendorGovernanceFacade {
  constructor(private readonly repository = new VendorOnboardingRepository()) {}
  async assertApproved(organizationId: string, vendorId: string) {
    const vendor = await this.repository.vendorStatus(organizationId, vendorId);
    if (!vendor) throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found.');
    if (vendor.status === 'BLACKLISTED' || vendor.blacklistedAt || vendor.riskRating === 'BLACKLISTED') {
      throw new AppError(409, 'VENDOR_BLACKLISTED', 'Blacklisted vendor is blocked from procurement/payment workflows.');
    }
    if (vendor.riskRating === 'HIGH') {
      throw new AppError(409, 'VENDOR_RISK_BLOCKED', 'High-risk vendor is blocked from procurement/payment workflows.');
    }
    if (vendor.status !== 'APPROVED') {
      throw new AppError(409, 'VENDOR_NOT_APPROVED', 'Vendor is not approved for procurement/payment workflows.');
    }
  }
}
