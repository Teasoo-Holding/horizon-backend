// Enhanced file-upload.service.ts
import { Injectable } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { Express } from 'express';

export interface UploadResult {
  url: string;
  publicId: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class FileUploadService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  async handleFileUpload(file?: Express.Multer.File): Promise<UploadResult> {
    if (!file) {
      return { url: '', publicId: '', success: false, error: 'No file provided' };
    }
    
    try {
      const result = await this.cloudinaryService.uploadImage(file);
      
      if ('url' in result && 'public_id' in result) {
        return { 
          url: result.url, 
          publicId: result.public_id, 
          success: true 
        };
      }
      
      return { 
        url: '', 
        publicId: '', 
        success: false, 
        error: 'Invalid response from cloud service' 
      };
    } catch (error) {
      return { 
        url: '', 
        publicId: '', 
        success: false, 
        error: error.message 
      };
    }
  }

  // Additional reusable method for multiple files
  async handleMultipleFileUpload(files: Express.Multer.File[]): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.handleFileUpload(file));
    return Promise.all(uploadPromises);
  }

  // Additional reusable method for file validation
  validateFile(file: Express.Multer.File, allowedTypes: string[], maxSize: number): boolean {
    if (!file) return false;
    if (file.size > maxSize) return false;
    if (!allowedTypes.includes(file.mimetype)) return false;
    return true;
  }
}