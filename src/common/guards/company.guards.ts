// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { PrismaService } from '../../prisma/prisma.service';

// @Injectable()
// export class CompanyGuard implements CanActivate {
//   constructor(private prisma: PrismaService) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const req = context.switchToHttp().getRequest();
//     const companyId = parseInt(req.params.company_id);
//     const userId = req.user?.id;

//     if (!userId || isNaN(companyId)) return false;

//     const user = await this.prisma.user.findUnique({
//       where: { id: userId, company_id: companyId },
//     });

//     return !!user;
//   }
// }
