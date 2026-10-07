import { PERMISSION_KEYS, type PermissionKey } from '@nexora/shared';

export type PermissionSet = readonly string[] | Set<string>;

export function hasPermission(permissions: PermissionSet, permission: PermissionKey | string) {
  return permissions instanceof Set ? permissions.has(permission) : permissions.includes(permission);
}

export function hasEveryPermission(permissions: PermissionSet, required: readonly (PermissionKey | string)[]) {
  return required.every((permission) => hasPermission(permissions, permission));
}

export function hasAnyPermission(permissions: PermissionSet, required: readonly (PermissionKey | string)[]) {
  return required.length === 0 || required.some((permission) => hasPermission(permissions, permission));
}

export function assertKnownPermission(permission: string): asserts permission is PermissionKey {
  if (!(PERMISSION_KEYS as readonly string[]).includes(permission)) {
    throw new Error(`Unknown permission key: ${permission}`);
  }
}

export { PERMISSION_KEYS };
export type { PermissionKey };
