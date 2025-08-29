import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Express } from 'express';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LocationBasedS2Dto } from './dto/create_scope-2_location_based.dto';
import { ReportingPeriod } from '@prisma/client';
import { NotFoundError } from 'rxjs';

@Injectable()
export class LocationBasedS2Service {
  private readonly logger = new Logger(LocationBasedS2Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Helper: Upload image or return empty string + empty publicId if not provided
   */
  private async handleFileUpload(file?: Express.Multer.File): Promise<{ url: string; publicId: string }> {
    console.log("Upload Result")
    if (!file) {
      return { url: '', publicId: '' };
    }
    const result = await this.cloudinaryService.uploadImage(file);
    console.log("Upload Result", result)
    if ('url' in result && 'public_id' in result) {
      return { url: result.url, publicId: result.public_id };
    }
    return { url: '', publicId: '' };
  }

 
  async create(dto: LocationBasedS2Dto, files: Record<string, Express.Multer.File[]>, user_id: number): Promise<any> {
    const invoiceElectricity = await this.handleFileUpload(files['invoice_from_electricity_distribution_companies_url']?.[0]);
    const smartMeter = await this.handleFileUpload(files['smart_or_sub_meter_reading_url']?.[0]);
    const utilityContract = await this.handleFileUpload(files['utility_contract_or_purchase_agreement_url']?.[0]);
    const coolingInvoice = await this.handleFileUpload(files['cooling_energy_invoices_from_service_providers_url']?.[0]);
    const equipmentLog = await this.handleFileUpload(files['equipment_performance_log_url']?.[0]);
    const subMetering = await this.handleFileUpload(files['sub_metering_records_url']?.[0]);
    const steamInvoice = await this.handleFileUpload(files['supplier_invoice_for_steam_purchased_url']?.[0]);
    const steamMetered = await this.handleFileUpload(files['metered_record_for_steam_consumed_url']?.[0]);
    const steamContract = await this.handleFileUpload(files['contracts_with_third_party_providers_url']?.[0]);
    const heatingInvoices = await this.handleFileUpload(files['invoices_for_heating_services_url']?.[0]);
    const heatingMetered = await this.handleFileUpload(files['metered_heating_records_url']?.[0]);
    const heatingSupplier = await this.handleFileUpload(files['supplier_contracts_url']?.[0]);
    const refrigerantCert = await this.handleFileUpload(files['certification_of_refigirant_type_url']?.[0]);

    if(!user_id){
      throw new NotFoundError('User not found')
    }
    
    const user = await this.prisma.user.findUnique({
      where: {id: user_id}
    })



    return this.prisma.locationBasedS2.create({
      data: {
        name: dto.name || '',
        subsidiaryId: user?.subsidiaryId || user?.companyId || 0 ,
        creator_id: user_id,
        total_electricity_consumption: dto.total_electricity_consumption || 0,
        reporting_period_consumption: dto.reporting_period_consumption || ReportingPeriod.MONTHLY,
        electricity_supplier: dto.electricity_supplier || '',
        invoice_from_electricity_distribution_companies_url: invoiceElectricity.url,
        invoice_from_electricity_distribution_companies_url_public_id: invoiceElectricity.publicId,
        smart_or_sub_meter_reading_url: smartMeter.url,
        smart_or_sub_meter_reading_url_public_id: smartMeter.publicId,
        utility_contract_or_purchase_agreement_url: utilityContract.url,
        utility_contract_or_purchase_agreement_url_public_id: utilityContract.publicId,
        amount_of_cooling_energy_consumed: dto.amount_of_cooling_energy_consumed || 0,
        purchased_cooling_type_of_cooling_system_used: dto.purchased_cooling_type_of_cooling_system_used || '',
        purchased_cooling_reporting_period: dto.purchased_cooling_reporting_period || ReportingPeriod.MONTHLY,
        cooling_energy_invoices_from_service_providers_url: coolingInvoice.url,
        cooling_energy_invoices_from_service_providers_url_public_id: coolingInvoice.publicId,
        equipment_performance_log_url: equipmentLog.url,
        equipment_performance_log_url_public_id: equipmentLog.publicId,
        sub_metering_records_url: subMetering.url,
        sub_metering_records_url_public_id: subMetering.publicId,
        total_steam_consumed: dto.total_steam_consumed || 0,
        source_of_steam_consumed: dto.source_of_steam_consumed || '',
        purchased_steam_reporting_period: dto.purchased_steam_reporting_period || ReportingPeriod.MONTHLY,
        supplier_invoice_for_steam_purchased_url: steamInvoice.url,
        supplier_invoice_for_steam_purchased_url_public_id: steamInvoice.publicId,
        metered_record_for_steam_consumed_url: steamMetered.url,
        metered_record_for_steam_consumed_url_public_id: steamMetered.publicId,
        contracts_with_third_party_providers_url: steamContract.url,
        contracts_with_third_party_providers_url_public_id: steamContract.publicId,
        was_heating_energy_purchased: dto.was_heating_energy_purchased || false,
        total_energyGJ: dto.total_energyGJ || 0,
        supplier: dto.supplier || '',
        invoices_for_heating_services_url: heatingInvoices.url,
        invoices_for_heating_services_url_public_id: heatingInvoices.publicId,
        metered_heating_records_url: heatingMetered.url,
        metered_heating_records_url_public_id: heatingMetered.publicId,
        supplier_contracts_url: heatingSupplier.url,
        supplier_contracts_url_public_id: heatingSupplier.publicId,
        certification_of_refigirant_type_url: refrigerantCert.url,
        certification_of_refigirant_type_url_public_id: refrigerantCert.publicId,
      },
    });
  }
 


  async findAll() {
    return this.prisma.locationBasedS2.findMany();
  }


  async findOne(id: number) {
    return this.prisma.locationBasedS2.findUnique({ where: { id } });
  }

async update(
    id: number, 
    dto: LocationBasedS2Dto, 
    files: Record<string, Express.Multer.File[]>,
    userId: number
  ): Promise<any> {
    // First, find the existing record
    const existingRecord = await this.prisma.locationBasedS2.findUnique({
      where: { id },
    });

    if (!existingRecord) {
      throw new NotFoundException('LocationBasedS2 record not found');
    }

    const updateData: any = { ...dto };

    const fileFields = [
      'invoice_from_electricity_distribution_companies_url',
      'smart_or_sub_meter_reading_url',
      'utility_contract_or_purchase_agreement_url',
      'cooling_energy_invoices_from_service_providers_url',
      'equipment_performance_log_url',
      'sub_metering_records_url',
      'supplier_invoice_for_steam_purchased_url',
      'metered_record_for_steam_consumed_url',
      'contracts_with_third_party_providers_url',
      'invoices_for_heating_services_url',
      'metered_heating_records_url',
      'supplier_contracts_url',
      'certification_of_refigirant_type_url',
    ];

    for (const field of fileFields) {
      if (files[field]?.[0]) {
        // Delete the old image from Cloudinary if it exists
        const publicIdField = `${field}_public_id`;
        const oldPublicId = existingRecord[publicIdField];
        
        if (oldPublicId) {
          try {
            await this.cloudinaryService.deleteImage(oldPublicId);
          } catch (error) {
            console.error(`Failed to delete old image for field ${field}:`, error);
            // Continue with update even if deletion fails
          }
        }

        // Upload the new file
        const uploadResult = await this.handleFileUpload(files[field][0]);
        
        // Add the new URL and public ID to the update data
        updateData[field] = uploadResult.url;
        updateData[publicIdField] = uploadResult.publicId;
      }
    }

    // Update the record
    return this.prisma.locationBasedS2.update({
      where: { id },
      data: {
        ...updateData,
        updated_by: userId,
      },
    });
  }

  /**
   * Delete
   */
  async remove(id: number) {
    return this.prisma.locationBasedS2.delete({ where: { id } });
  }
}
