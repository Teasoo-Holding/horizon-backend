import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubsidiaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async create(createSubsidiaryDto: CreateSubsidiaryDto, user_id: number) {
    try {
      const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        companyId: true,
        first_name: true,
        role: { select: { name: true } },
      },
    });

    const company = await this.prisma.company.findUnique({
      where: { id: user?.companyId ?? 0 },
      select: {
        id: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${user_id} not found`);
    }

    if (!['company_esg_admin', 'company_esg_subadmin', 'super_admin'].includes(user.role.name)) {
      throw new ForbiddenException(
        'You are not authorized to create a subsidiary',
      );
    }

    const teamLead = await this.prisma.user.findUnique({
      where: { email: createSubsidiaryDto.teamLead_email },
    });

    let new_user;
    if (!teamLead) {
      // throw new NotFoundException(
      //   `Team lead with email ${createSubsidiaryDto.teamLead_email} not found`,
      // );
      new_user = await this.prisma.user.create({
        data: {
          email: createSubsidiaryDto.teamLead_email ?? '',
          first_name: createSubsidiaryDto?.teamLead_name ?? '',
          companyId: user.companyId,
          password: '', 
          roleId: 2,
        },
      });
      await this.emailService.sendEmail(
        new_user.email as string,
        {
          first_name: createSubsidiaryDto?.teamLead_name ?? '',
          link: this.configService.get('FRONTEND_URL') + '/register',
          admin_name: user.first_name,
          esg_name: company?.name,
        },
        6,
      );
    }

    if (teamLead && teamLead.companyId !== user.companyId) {
      throw new ForbiddenException(
        'You can only create subsidiaries with your own team lead',
      );
    }

    const subsidiary = await this.prisma.subsidiary.create({
      data: {
        name: createSubsidiaryDto.name,
        industry: createSubsidiaryDto.industry,
        parentCompanyId: user.companyId,
        created_by: user.id,
        updated_by: user.id,
        teamLeadId: (teamLead ? teamLead.id : new_user!.id),
        registration_number: createSubsidiaryDto.registration_number,
        sicsCode: createSubsidiaryDto.sicsCode,
        isinCode: createSubsidiaryDto.isinCode,
        isoCountryCode: createSubsidiaryDto.isoCountryCode,
        address: createSubsidiaryDto.address,
        country: createSubsidiaryDto.country,
        currency: createSubsidiaryDto.currency,
        contact_email: createSubsidiaryDto.contact_email,
        website: createSubsidiaryDto.website,
        contact_phone: createSubsidiaryDto.contact_phone,
        company_logo_url: createSubsidiaryDto.company_logo_url,
      },
    });

    await this.emailService.sendEmail(
      createSubsidiaryDto.teamLead_email as string,
      {
        first_name: createSubsidiaryDto?.teamLead_name ?? '',
        admin_name: user.first_name,
        esg_name: company?.name,
        subsidiary_name: createSubsidiaryDto.name,
      },
      10
    );

    return subsidiary;
    }
    catch(error){
      console.error("Error creating subsidiary:", error);
      throw new Error("Error creating subsidiary");
    }
  }

 



  async findAll(user_id: number) {

    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      include: {
        role: true,
      }
    })

    if(user?.role.name !== 'super_admin') {
      throw new ForbiddenException('You are not authorized to view all subsidiaries');
    }

    return await this.prisma.subsidiary.findMany();
  }

  async findCompanySubsidiaries(user_id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
    })

    return await this.prisma.subsidiary.findMany({
      where: { parentCompanyId: user?.companyId }
    });
  }



  async findOne(id: number) {
    const subsidiary = await this.prisma.subsidiary.findUnique({
      where: { id }
    });
    if(!subsidiary) {
      throw new NotFoundException('Subsidiary not found');
    }
    return subsidiary;
  }

  

  async update(id: number, updateSubsidiaryDto: UpdateSubsidiaryDto, user_id: number) {
  try {

    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${user_id} not found`);
    }

    const existingSubsidiary = await this.prisma.subsidiary.findUnique({
      where: { id },
      include: { teamLead: true, parentCompany: true },
    });

    if (!existingSubsidiary) {
      throw new NotFoundException(`Subsidiary with ID ${id} not found`);
    }


    if (user.companyId !== existingSubsidiary.parentCompanyId) {
      throw new ForbiddenException(
        'You can only update subsidiaries of your own company',
      );
    }

  
    const data: any = {
      name: updateSubsidiaryDto.name ?? existingSubsidiary.name,
      industry: updateSubsidiaryDto.industry ?? existingSubsidiary.industry,
      registration_number:
        updateSubsidiaryDto.registration_number ??
        existingSubsidiary.registration_number,
      sicsCode: updateSubsidiaryDto.sicsCode ?? existingSubsidiary.sicsCode,
      isinCode: updateSubsidiaryDto.isinCode ?? existingSubsidiary.isinCode,
      isoCountryCode:
        updateSubsidiaryDto.isoCountryCode ??
        existingSubsidiary.isoCountryCode,
      sector: updateSubsidiaryDto.sector ?? existingSubsidiary.sector,
      subSector: updateSubsidiaryDto.subSector ?? existingSubsidiary.subSector,
      address: updateSubsidiaryDto.address ?? existingSubsidiary.address,
      country: updateSubsidiaryDto.country ?? existingSubsidiary.country,
      currency: updateSubsidiaryDto.currency ?? existingSubsidiary.currency,
      contact_email:
        updateSubsidiaryDto.contact_email ?? existingSubsidiary.contact_email,
      website: updateSubsidiaryDto.website ?? existingSubsidiary.website,
      contact_phone:
        updateSubsidiaryDto.contact_phone ?? existingSubsidiary.contact_phone,
      company_logo_url:
        updateSubsidiaryDto.company_logo_url ??
        existingSubsidiary.company_logo_url,
      status: updateSubsidiaryDto.status ?? existingSubsidiary.status,
      updated_by: user.id,
    };


    if (updateSubsidiaryDto.parentCompanyId) {
      data.parentCompany = {
        connect: { id: updateSubsidiaryDto.parentCompanyId },
      };
    }

    if (
      updateSubsidiaryDto.teamLead_email ||
      updateSubsidiaryDto.teamLead_name
    ) {
      data.teamLead = {
        update: {
          email:
            updateSubsidiaryDto.teamLead_email ??
            existingSubsidiary.teamLead?.email,
          first_name:
            updateSubsidiaryDto.teamLead_name ??
            existingSubsidiary.teamLead?.first_name,
        },
      };
    }

    return await this.prisma.subsidiary.update({
      where: { id },
      data,
      include: { teamLead: true, parentCompany: true },
    });
  } catch (error) {
    console.error('Error updating subsidiary:', error);

    if (error instanceof NotFoundException || error instanceof ForbiddenException) {
      throw error; 
    }

    throw new InternalServerErrorException(
      'An unexpected error occurred while updating the subsidiary',
    );
  }
}


  async remove(id: number, user_id:number) {

     const user = await this.prisma.user.findUnique({
      where: { id: user_id }
    });

    const subsidiary = await this.prisma.subsidiary.findUnique({
      where: { id }
    });

    if(user?.companyId !== subsidiary?.parentCompanyId) {
      throw new ForbiddenException('You can only update subsidiaries of your own company');
    } 


    return this.prisma.subsidiary.delete({
      where: { id }
    });
  }
}
