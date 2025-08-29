import { AssessmentStatus, DisclosureCategory } from '@prisma/client';
import { Scope1Dto } from '../scope1/scope1-dto/scope1.dto';
import { File } from '../common/file.interface';

export class AssessmentDto {
  id: number;
  subsidiary: string;
  reportingPeriod: string;
  status: AssessmentStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  createdById: number;
  disclosureTopics?:
    | {
        id: number;
        assessmentId: number;
        category: DisclosureCategory;
        topic: string;
        subtopic: string;
        ghgData?:
          | {
              id: number;
              disclosureTopicId: number;
              scope1?: Scope1Dto | null;
              scope2?: any | null;
              scope3?: any | null;
            }
          | null
          | undefined;
        airQualityData?: File[] | null;
        waterData?: File[] | null;
      }[]
    | null
    | undefined;
}
