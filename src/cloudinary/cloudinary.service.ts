import { Injectable, Inject, Logger } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse} from 'cloudinary';
import * as toStream from 'buffer-to-stream';
import { CLOUDINARY } from './entities/constants.coudinary';
import { Express } from 'express';



@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(@Inject(CLOUDINARY) private readonly cloudinary) {}

  async uploadImage(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error: Error, result: UploadApiResponse | UploadApiErrorResponse | PromiseLike<UploadApiResponse | UploadApiErrorResponse>) => {
          if (error) {
            this.logger.error(`Cloudinary upload error: ${error.message}`);
            return reject(error);
          }
          resolve(result);
        },
      );

      toStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<any> {
    try {
      return await this.cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.error(`Failed to delete image: ${error.message}`);
      throw new Error('Image deletion failed');
    }
  }

  async uploadMultipleImages(files: Express.Multer.File[]): Promise<any[]> {
  try {
    const uploadPromises = files.map(file => this.uploadImage(file));
    return await Promise.all(uploadPromises);
  } catch (error) {
    this.logger.error(`Multiple upload failed: ${error.message}`);
    throw new Error('Multiple image upload failed');
  }
}
}