
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUserDecorator = createParamDecorator(
  (property: keyof any | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return property ? user?.[property] : user;
  },
);
