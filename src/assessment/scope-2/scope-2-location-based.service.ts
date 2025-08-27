import { Injectable, Logger } from '@nestjs/common';
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
    if (!file) {
      return { url: '', publicId: '' };
    }
    const result = await this.cloudinaryService.uploadImage(file);
    if ('secure_url' in result && 'public_id' in result) {
      return { url: result.secure_url, publicId: result.public_id };
    }
    return { url: '', publicId: '' };
  }

 
  async create(dto: LocationBasedS2Dto, files: Record<string, Express.Multer.File>, user_id: number): Promise<any> {
    // Upload all file fields (map each field to Cloudinary)
    const invoiceElectricity = await this.handleFileUpload(files['invoice_from_electricity_distribution_companies_url']);
    const smartMeter = await this.handleFileUpload(files['smart_or_sub_meter_reading_url']);
    const utilityContract = await this.handleFileUpload(files['utility_contract_or_purchase_agreement_url']);
    const coolingInvoice = await this.handleFileUpload(files['cooling_energy_invoices_from_service_providers_url']);
    const equipmentLog = await this.handleFileUpload(files['equipment_performance_log_url']);
    const subMetering = await this.handleFileUpload(files['sub_metering_records_url']);
    const steamInvoice = await this.handleFileUpload(files['supplier_invoice_for_steam_purchased_url']);
    const steamMetered = await this.handleFileUpload(files['metered_record_for_steam_consumed_url']);
    const steamContract = await this.handleFileUpload(files['contracts_with_third_party_providers_url']);
    const heatingInvoices = await this.handleFileUpload(files['invoices_for_heating_services_url']);
    const heatingMetered = await this.handleFileUpload(files['metered_heating_records_url']);
    const heatingSupplier = await this.handleFileUpload(files['supplier_contracts_url']);
    const refrigerantCert = await this.handleFileUpload(files['certification_of_refigirant_type_url']);

    if(!user_id){
      throw new NotFoundError('User not found')
    }

    const user = await this.prisma.user.findUnique({
      where: {id: user_id}
    })
    return this.prisma.locationBasedS2.create({
      data: {
        name: dto.name || '',
        companyId: user?.companyId || 0 ,
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

  async update(id: number, dto: LocationBasedS2Dto, files: Record<string, Express.Multer.File>) {
    const existing = await this.findOne(id);
    if (!existing) throw new Error(`Record with id ${id} not found`);

    // Handle file re-upload if new file exists, else keep old one
    const invoiceElectricity = files['invoice_from_electricity_distribution_companies_url']
      ? await this.handleFileUpload(files['invoice_from_electricity_distribution_companies_url'])
      : { url: existing.invoice_from_electricity_distribution_companies_url, publicId: existing.invoice_from_electricity_distribution_companies_url_public_id };

    return this.prisma.locationBasedS2.update({
      where: { id },
      data: {
        ...dto,
        invoice_from_electricity_distribution_companies_url: invoiceElectricity.url,
        invoice_from_electricity_distribution_companies_url_public_id: invoiceElectricity.publicId,
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
