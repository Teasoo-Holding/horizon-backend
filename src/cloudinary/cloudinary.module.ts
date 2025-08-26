import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';
import { UploadController } from './cloudinary.controller';

@Module({
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService],
  controllers: [UploadController],
})
export class CloudinaryModule {}