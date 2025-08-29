import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadResult } from 'src/cloudinary/file-upload.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Express } from 'express';
import { MarketBasedS2Dto } from './dto/create-scope-2.market_baseddto';

@Injectable()
export class MarketBasedS2Service {
  private readonly logger = new Logger(MarketBasedS2Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async handleFileUpload(file?: Express.Multer.File): Promise<UploadResult> {
    if (!file) {
      return {
        url: '',
        publicId: '',
        success: false,
        error: 'No file provided',
      };
    }

    try {
      const result = await this.cloudinaryService.uploadImage(file);

      if ('url' in result && 'public_id' in result) {
        return {
          url: result.url,
          publicId: result.public_id,
          success: true,
        };
      }

      return {
        url: '',
        publicId: '',
        success: false,
        error: 'Invalid response from cloud service',
      };
    } catch (error) {
      return {
        url: '',
        publicId: '',
        success: false,
        error: error.message,
      };
    }
  }

  async create(
    dto: MarketBasedS2Dto,
    files: Record<string, Express.Multer.File[]>,
    user_id: number,
  ): Promise<any> {
    // Handle all file uploads
    const electricityContract = await this.handleFileUpload(
      files['electricity_supplier_contract_with_ipps_url']?.[0],
    );
    const emissionFactorDoc = await this.handleFileUpload(
      files['supplier_issued_emmission_factor_documentation_url']?.[0],
    );
    const ippInvoices = await this.handleFileUpload(
      files['invoices_and_bills_from_ipp_url']?.[0],
    );
    const eacRecCertificate = await this.handleFileUpload(
      files['eac_or_rec_certificate_url']?.[0],
    );
    const energyAttributeCert = await this.handleFileUpload(
      files['energy_attribute_certificate_url']?.[0],
    );
    const gridConsumptionInvoices = await this.handleFileUpload(
      files['grid_consumption_invoices_url']?.[0],
    );
    const purchasedAgreement = await this.handleFileUpload(
      files['contracts_or_purchased_agreement_url']?.[0],
    );
    const gridElectricityInvoices = await this.handleFileUpload(
      files['grid_electricity_invoices_url']?.[0],
    );
    const nigerianGridEmissionDoc = await this.handleFileUpload(
      files['nigerian_grid_emmission_factor_documentation_url']?.[0],
    );
    const supplierContacts = await this.handleFileUpload(
      files['supplier_contacts_url']?.[0],
    );
    const coolingSteamInvoices = await this.handleFileUpload(
      files['supplier_invoices_for_cooling_or_steam_purchases_url']?.[0],
    );
    const emissionFactorDataSheet = await this.handleFileUpload(
      files['supplier_emmission_factor_data_sheet_url']?.[0],
    );
    const operationalLogs = await this.handleFileUpload(
      files['performance_or_operational_logs_url']?.[0],
    );

    if (!user_id) {
      throw new NotFoundException('User not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.marketBasedS2.create({
      data: {
        name: dto.name || '',
        total_electricity_consumed: dto.total_electricity_consumed || 0,
        supplier_specific_emission_factor:
          dto.supplier_specific_emission_factor || 0,
        subsidiaryId: dto.subsidiaryId || user.companyId,
        electricity_supplier_contract_with_ipps_url: electricityContract.url,
        electricity_supplier_contract_with_ipps_url_public_id:
          electricityContract.publicId,
        supplier_issued_emmission_factor_documentation_url:
          emissionFactorDoc.url,
        supplier_issued_emmission_factor_documentation_url_public_id:
          emissionFactorDoc.publicId,
        invoices_and_bills_from_ipp_url: ippInvoices.url,
        invoices_or_bills_from_ipp_url_public_id: ippInvoices.publicId,
        total_grid_energy_consumed: dto.total_grid_energy_consumed || 0,
        eac_or_rec_certificate_url: eacRecCertificate.url,
        eac_or_rec_certificate_url_public_id: eacRecCertificate.publicId,
        emission_factor_applied: dto.emission_factor_applied || 0,
        energy_attribute_certificate_url: energyAttributeCert.url,
        energy_attribute_certificate_url_public_id:
          energyAttributeCert.publicId,
        grid_consumption_invoices_url: gridConsumptionInvoices.url,
        grid_consumption_invoices_url_public_id:
          gridConsumptionInvoices.publicId,
        contracts_or_purchased_agreement_url: purchasedAgreement.url,
        contracts_or_purchased_agreement_url_public_id:
          purchasedAgreement.publicId,
        purchased_electricity_total_electricity_consumed:
          dto.purchased_electricity_total_electricity_consumed || 0,
        residual_mix_emission_factor_applied:
          dto.residual_mix_emission_factor_applied || 0,
        grid_electricity_invoices_url: gridElectricityInvoices.url,
        grid_electricity_invoices_url_public_id:
          gridElectricityInvoices.publicId,
        nigerian_grid_emission_factor_documentation_url:
          nigerianGridEmissionDoc.url,
        nigerian_grid_emission_factor_documentation_url_public_id:
          nigerianGridEmissionDoc.publicId,
        supplier_contacts_url: supplierContacts.url,
        supplier_contacts_url_public_id: supplierContacts.publicId,
        purchased_cooling_quantity_consumed:
          dto.purchased_cooling_quantity_consumed || 0,
        purchased_cooling_supplier_specific_emission_factor_applied:
          dto.purchased_cooling_supplier_specific_emission_factor_applied || 0,
        supplier_invoices_for_cooling_or_steam_purchases_url:
          coolingSteamInvoices.url,
        supplier_invoices_for_cooling_or_steam_purchases_url_public_id:
          coolingSteamInvoices.publicId,
        supplier_emission_factor_data_sheet_url: emissionFactorDataSheet.url,
        supplier_emission_factor_data_sheet_url_public_id:
          emissionFactorDataSheet.publicId,
        performance_or_operational_logs_url: operationalLogs.url,
        performance_or_operational_logs_url_public_id: operationalLogs.publicId,
        creator_id: user_id,
      },
    });
  }


   async findOne(id: number) {
    return this.prisma.marketBasedS2.findUnique({ where: { id } });
  }



  async update(
    id: number, 
    dto: MarketBasedS2Dto, 
    files: Record<string, Express.Multer.File[]>,
    userId: number
  ): Promise<any> {
    const existingRecord = await this.prisma.marketBasedS2.findUnique({
      where: { id },
    });

    if (!existingRecord) {
      throw new NotFoundException('MarketBasedS2 record not found');
    }

    if (existingRecord.creator_id !== userId) {
      throw new NotFoundException('You do not have permission to update this record');
    }

    const updateData: any = { ...dto };

    // Handle file uploads and deletions for each file field
    const fileFields = [
      'electricity_supplier_contract_with_ipps_url',
      'supplier_issued_emmission_factor_documentation_url',
      'invoices_and_bills_from_ipp_url',
      'eac_or_rec_certificate_url',
      'energy_attribute_certificate_url',
      'grid_consumption_invoices_url',
      'contracts_or_purchased_agreement_url',
      'grid_electricity_invoices_url',
      'nigerian_grid_emmission_factor_documentation_url',
      'supplier_contacts_url',
      'supplier_invoices_for_cooling_or_steam_purchases_url',
      'supplier_emmission_factor_data_sheet_url',
      'performance_or_operational_logs_url',
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
    return this.prisma.marketBasedS2.update({
      where: { id },
      data: {
        ...updateData,
        updated_by: userId, 
      },
    });
  }
}
