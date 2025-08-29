import { Injectable } from '@nestjs/common';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentDto } from './dto/assessment.dto';

@Injectable()
export class AssessmentService {
  private assessments: any[] = [];
  private counter = 1;

  async create(
    createAssessmentDto: CreateAssessmentDto,
  ): Promise<AssessmentDto> {
    const newAssessment: any = {
      id: this.counter++,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...createAssessmentDto,
    };
    this.assessments.push(newAssessment);
    return newAssessment;
  }

  async findAll(): Promise<AssessmentDto[]> {
    return this.assessments;
  }

  async findOne(id: number): Promise<AssessmentDto | null> {
    return this.assessments.find((a) => a.id === id) || null;
  }

  async update(
    id: number,
    updateAssessmentDto: UpdateAssessmentDto,
  ): Promise<AssessmentDto | null> {
    const index = this.assessments.findIndex((a) => a.id === id);
    if (index === -1) return null;

    this.assessments[index] = {
      ...this.assessments[index],
      ...updateAssessmentDto,
      updatedAt: new Date(),
    };

    return this.assessments[index];
  }

  async remove(id: number): Promise<boolean> {
    const index = this.assessments.findIndex((a) => a.id === id);
    if (index === -1) return false;
    this.assessments.splice(index, 1);
    return true;
  }
}
