const roleMappings: Record<string, string> = {
  super_admin: 'Super Admin',
  platform_admin: 'Platform Subadmin',
  platform_data_officer: 'Platform Data Officer',
  platform_viewer: 'Platform Viewer',
  company_esg_admin: 'Company Admin',
  company_esg_subadmin: 'Company Subadmin',
  company_esg_data_officer: 'Company Data Officer',
  company_esg_viewer: 'Company Viewer',
};

export function formatRoleName(roleKey: string): string {
  return roleMappings[roleKey] ?? roleKey;
}
