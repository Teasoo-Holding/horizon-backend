import { RoleName } from '@prisma/client';

// ── Platform-level roles (Teasoo interface) ──
export const PLATFORM_ROLES = [
  RoleName.super_admin,
  RoleName.platform_subadmin,
  RoleName.platform_data_officer,
  RoleName.platform_viewer,
] as const;

// ── Company-level roles (End User interface) ──
export const COMPANY_ROLES = [
  RoleName.company_esg_admin,
  RoleName.company_esg_subadmin,
  RoleName.company_esg_data_officer,
  RoleName.company_esg_viewer,
] as const;

// ── All roles (convenience) ──
export const ALL_ROLES = [...PLATFORM_ROLES, ...COMPANY_ROLES] as const;

// ── Roles that can access any company's data (cross-company) ──
export const CROSS_COMPANY_ROLES = [
  RoleName.super_admin,
  RoleName.platform_subadmin,
  RoleName.platform_data_officer,
  RoleName.platform_viewer,
] as const;

// ── Roles that can write/modify ESG data ──
export const DATA_WRITE_ROLES = [
  RoleName.super_admin,
  RoleName.platform_subadmin,
  RoleName.platform_data_officer,
  RoleName.company_esg_admin,
  RoleName.company_esg_subadmin,
  RoleName.company_esg_data_officer,
] as const;

// ── Roles that can validate/approve submissions ──
export const VALIDATOR_ROLES = [
  RoleName.super_admin,
  RoleName.platform_subadmin,
  RoleName.company_esg_admin,
  RoleName.company_esg_subadmin,
] as const;

// ── Roles that are strictly read-only ──
export const VIEWER_ROLES = [
  RoleName.platform_viewer,
  RoleName.company_esg_viewer,
] as const;

// ── Roles that can manage users & invitations ──
export const USER_MANAGEMENT_ROLES = [
  RoleName.super_admin,
  RoleName.platform_subadmin,
  RoleName.company_esg_admin,
  RoleName.company_esg_subadmin,
] as const;

// ── Default role for invited team/department leads ──
export const DEFAULT_TEAM_LEAD_ROLE = RoleName.company_esg_subadmin;

// ── Helpers ──

/**
 * Resolves a RoleName to its database ID.
 * Use this instead of hardcoding roleId numbers.
 */
export async function resolveRoleId(
  prisma: { role: { findUnique: (args: { where: { name: string }; select: { id: true } }) => Promise<{ id: number } | null> } },
  roleName: RoleName,
): Promise<number> {
  const role = await prisma.role.findUnique({
    where: { name: roleName },
    select: { id: true },
  });
  if (!role) throw new Error(`Role "${roleName}" not found in database`);
  return role.id;
}

export function isPlatformRole(role: string): boolean {
  return (PLATFORM_ROLES as readonly string[]).includes(role);
}

export function hasCrossCompanyAccess(role: string): boolean {
  return (CROSS_COMPANY_ROLES as readonly string[]).includes(role);
}
