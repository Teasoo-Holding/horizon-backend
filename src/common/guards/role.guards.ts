import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorators';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException('You do not have permission (role missing)');
    }

    let userRoles: string[] = [];

    if (typeof user.role === 'string') {
      userRoles = [user.role];
    } else if (Array.isArray(user.role)) {
      userRoles = user.role;
    } else if (typeof user.role === 'object' && user.role.name) {
      userRoles = [user.role.name];
    }

    // Check for role match
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('You do not have permission (invalid role)');
    }

    return true;
  }
}
