import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_KEY } from '../decorators/access.decorator';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredAccessLevels = this.reflector.getAllAndOverride<string[]>(
      ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredAccessLevels || requiredAccessLevels.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as {
      accessLevel?: string;
    };

    if (
      !user?.accessLevel ||
      !requiredAccessLevels.includes(user.accessLevel)
    ) {
      throw new ForbiddenException('You do not have permission (access level)');
    }

    return true;
  }
}
