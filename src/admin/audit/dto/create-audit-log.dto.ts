import { IsString, IsOptional, IsInt, IsObject } from 'class-validator';

export class CreateAuditLogDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  actorName?: string;

  @IsOptional()
  @IsString()
  actorEmail?: string;

  @IsOptional()
  @IsString()
  actorRole?: string;

  @IsString()
  module: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsString()
  ipAddress?: string;
}
