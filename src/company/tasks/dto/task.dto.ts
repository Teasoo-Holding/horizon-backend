// task.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class AssignTaskDto {
  @ApiProperty({ example: 'Complete ESG assessment for Q4' })
  @IsString()
  @IsNotEmpty()
  taskName: string;

  @ApiProperty({ example: '2025-12-31T00:00:00.000Z' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: [1, 2], description: 'Array of user IDs to assign' })
  @IsArray()
  @IsNotEmpty()
  userIds: number[];

  @ApiProperty({ example: ['topic1', 'topic2'], required: false })
  @IsArray()
  @IsOptional()
  topics?: string[];

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;
}

export class ReassignTaskDto {
  @ApiProperty({
    example: [1, 2],
    description: 'New array of user IDs for reassignment',
  })
  @IsArray()
  @IsNotEmpty()
  userIds: number[];

  @ApiProperty({ example: ['topic1'], required: false })
  @IsArray()
  @IsOptional()
  topics?: string[];
}
