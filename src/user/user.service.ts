import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  findMe(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        profile_photo_url: true,
        status: true,
        last_login: true,
        created_at: true,
        updated_at: true,
        company: {
          select: { name: true, company_logo_url: true },
        },
        department: {
          select: { name: true },
        },
        role: {
          select: { name: true },
        },
      },
    });
  }

  async updateMe(userId: number, dto: UpdateMeDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role, ...rest } = dto;

    const updateData: Prisma.UserUpdateInput = {};

    if (rest.first_name !== undefined) updateData.first_name = rest.first_name;
    if (rest.last_name !== undefined) updateData.last_name = rest.last_name;
    if (rest.email !== undefined) updateData.email = rest.email;
    if (rest.phone_number !== undefined)
      updateData.phone_number = rest.phone_number;

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async getAllPlatformUsers() {
    return this.prisma.user.findMany({
      include: {
        company: true,
        role: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getAllUserRoles() {
    return this.prisma.role.findMany();
  }


async getMonthlyRevenue(year: number, month: number) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const subscriptions = await this.prisma.companySubscription.findMany({
    where: {
      status: "ACTIVE",
      start_date: { lte: endOfMonth },
      OR: [
        { end_date: null },
        { end_date: { gte: startOfMonth } }
      ]
    },
    include: {
      Subscription: true
    }
  });

  const totalRevenue = subscriptions.reduce((sum, sub) => {
    return sum + sub.Subscription.price_monthly;
  }, 0);

  return { month, year, totalRevenue };
}



  async getSuperAdminDashboard(userId: number){
    const user = await this.prisma.user.findUnique({
      where: {id: userId}
    })

    if (!user || user.companyId !== 1) {
  throw new UnauthorizedException();
}

    const users = await this.prisma.user.count({
      where: {
        companyId: 1 
      }
    })

  const companies = await this.prisma.company.count();
  const active_subscriptions = await this.prisma.companySubscription.count({
    where: {
      status: "ACTIVE"
    }
  });
  const company_regulators = await this.prisma.user.count({
    where: {
      role: {
        name: "REGULATOR"
      }
    }
  });
  const company_investors = await this.prisma.user.count({
    where: {
      role: {
        name: "INVESTOR"
      }
    }
  });

  const this_month_revenue = await this.getMonthlyRevenue(new Date().getFullYear(), new Date().getMonth() + 1);



    const admins = {
      numbers: users,
      change: 0
    }
    const esg_company = {
      numbers: companies,
      change: 0
    }
    const regulators = {
      numbers: company_regulators,
      change: 0
    }
    const investors = {
      numbers: company_investors,
      change: 0
    }

    const reports_and_assessment = {

    }
    const subscription = {
      monthly_revenue : this_month_revenue,
      active_subscriptions: active_subscriptions,
      pending_payments: 0,
      growth_rate: 0
    }

    const recent_activity = [
      {title: "", time: '', description: ""}
    ]

   const industry_leaderboard = [
      {

      }
    ]

    const most_recent = [
      {
        company: "",
        registration_no: "",
        sector: "",
        status: "",
      }
    ]
    return {
      admins,
      esg_company,
      regulators,
      investors,
      reports_and_assessment,
      subscription,
      recent_activity,
      industry_leaderboard,
      most_recent
    }
  }

}
