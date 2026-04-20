import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { 
  CreateRoleDto, 
  UpdateRoleDto,
  CreatePermissionDto, 
  UpdateMatrixDto,
  RoleListItemDto,
  PermissionGroupDto,
  PermissionMatrixRowDto
} from '../dto/admin-roles-permissions.dto';

@Injectable()
export class AdminRolesPermissionsService {
  constructor(private prisma: PrismaService) { }

  async getRoles(): Promise<RoleListItemDto[]> {
    const roles = await this.prisma.role.findMany({
      include: {
        _count: {
          select: { users: true, rolePermissions: true }
        },
        rolePermissions: {
          include: { permission: true },
          take: 3
        }
      }
    });

    const totalPermissions = await this.prisma.permission.count();

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description || '',
      status: 'Active',
      usersAssigned: role._count.users,
      permissionsCount: role._count.rolePermissions,
      totalPermissions,
      keyPermissions: role.rolePermissions.map(rp => rp.permission.label)
    }));
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Role already exists');

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: dto.name,
          description: dto.description
        }
      });

      // Handle Inheritance
      if (dto.inheritFrom) {
        const parentPermissions = await tx.rolePermission.findMany({
          where: { roleId: dto.inheritFrom }
        });

        if (parentPermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: parentPermissions.map(p => ({
              roleId: role.id,
              permissionId: p.permissionId
            }))
          });
        }
      }

      // Handle explicit assignments
      if (dto.assignedPermissions && dto.assignedPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.assignedPermissions.map(pId => ({
            roleId: role.id,
            permissionId: pId
          })),
          skipDuplicates: true
        });
      }

      return role;
    });
  }

  async updateRole(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description
      }
    });
  }

  async deleteRole(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } }
    });
    if (!role) throw new NotFoundException('Role not found');

    if (role._count.users > 0) {
      throw new ConflictException('Cannot delete a role that is currently assigned to users.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Clean up assignments first
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      return tx.role.delete({ where: { id } });
    });
  }

  async getPermissionGroups(): Promise<PermissionGroupDto[]> {
    const groups = await this.prisma.permissionGroup.findMany({
      include: { permissions: true }
    });

    return groups.map(g => ({
      id: g.id,
      name: g.name,
      permissions: g.permissions.map(p => ({
        id: p.id,
        key: p.key,
        label: p.label,
        description: p.description || '',
        groupId: p.groupId
      }))
    }));
  }

  async createPermissionGroup(dto: { name: string }) {
    const existing = await this.prisma.permissionGroup.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Permission group already exists');

    return this.prisma.permissionGroup.create({
      data: { name: dto.name }
    });
  }

  async updatePermissionGroup(id: number, dto: { name: string }) {
    const group = await this.prisma.permissionGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Permission group not found');

    return this.prisma.permissionGroup.update({
      where: { id },
      data: { name: dto.name }
    });
  }

  async deletePermissionGroup(id: number) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: { _count: { select: { permissions: true } } }
    });
    if (!group) throw new NotFoundException('Permission group not found');

    if (group._count.permissions > 0) {
      throw new ConflictException('Cannot delete group with existing permissions. Move or delete them first.');
    }

    return this.prisma.permissionGroup.delete({ where: { id } });
  }

  async createPermission(dto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findUnique({ where: { key: dto.key } });
    if (existing) throw new ConflictException('Permission key already exists');

    return this.prisma.$transaction(async (tx) => {
      const permission = await tx.permission.create({
        data: {
          key: dto.key,
          label: dto.label,
          groupId: dto.groupId
        }
      });

      // Always assign to Super Admin
      const superAdminRole = await tx.role.findUnique({ where: { name: 'super_admin' } });
      if (superAdminRole) {
        await tx.rolePermission.create({
          data: {
            roleId: superAdminRole.id,
            permissionId: permission.id
          }
        });
      }

      // Explicit assignments
      if (dto.assignToRoles && dto.assignToRoles.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.assignToRoles
            .filter(rId => rId !== superAdminRole?.id)
            .map(rId => ({
              roleId: rId,
              permissionId: permission.id
            })),
          skipDuplicates: true
        });
      }

      return permission;
    });
  }

  async getPermissionMatrix(): Promise<PermissionMatrixRowDto[]> {
    const [permissions, roles, assignments] = await Promise.all([
      this.prisma.permission.findMany({ include: { group: true } }),
      this.prisma.role.findMany({ select: { id: true } }),
      this.prisma.rolePermission.findMany()
    ]);

    return permissions.map(p => {
      const roleAssignments: Record<number, boolean> = {};
      roles.forEach(r => {
        roleAssignments[r.id] = assignments.some(a => a.permissionId === p.id && a.roleId === r.id);
      });

      return {
        permissionId: p.id,
        label: p.label,
        groupName: p.group?.name || 'Uncategorized',
        roleAssignments
      };
    });
  }

  async updatePermissionMatrix(dto: UpdateMatrixDto) {
    if (dto.enabled) {
      return this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: dto.roleId,
            permissionId: dto.permissionId
          }
        },
        create: {
          roleId: dto.roleId,
          permissionId: dto.permissionId
        },
        update: {}
      });
    } else {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (role?.name === 'super_admin') {
      }

      return this.prisma.rolePermission.delete({
        where: {
          roleId_permissionId: {
            roleId: dto.roleId,
            permissionId: dto.permissionId
          }
        }
      }).catch(() => null); // Ignore if already not there
    }
  }
}
