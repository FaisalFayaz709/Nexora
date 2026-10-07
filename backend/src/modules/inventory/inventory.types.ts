export interface InventoryWarehouse {
  readonly id: string;
  readonly organizationId: string;
  readonly branchId: string;
  readonly status: string;
}

export interface InventoryProduct {
  readonly id: string;
  readonly organizationId: string;
  readonly trackingType: string;
  readonly minStock: { toString(): string } | null;
}
