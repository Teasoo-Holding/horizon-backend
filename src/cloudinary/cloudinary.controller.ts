import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  // FileTypeValidator,
  Param,
  Delete,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { Express } from 'express';

@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          // new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    try {
      const result = await this.cloudinaryService.uploadImage(file);
      
      return {
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          size: result.bytes,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
  

   @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleImages(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB per file
          // new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ) {
    try {
      const results = await this.cloudinaryService.uploadMultipleImages(files);
      
      return {
        success: true,
        message: `${files.length} images uploaded successfully`,
        data: results.map(result => ({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          size: result.bytes,
        })),
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  // Delete image (new)
  @Delete('image/:publicId')
  async deleteImage(@Param('publicId') publicId: string) {
    try {
      const result = await this.cloudinaryService.deleteImage(publicId);
      
      return {
        success: true,
        message: 'Image deleted successfully',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`Deletion failed: ${error.message}`);
    }
  }
}