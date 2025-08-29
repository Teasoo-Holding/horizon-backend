import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateScope1Dto } from './scope1-dto/create-scope1.dto';
import { UpdateScope1Dto } from './scope1-dto/update-scope1.dto';
import { Scope1Dto } from './scope1-dto/scope1.dto';
import { File } from '../common/file.interface';
import { Prisma } from '@prisma/client';

// Define Prisma query output type for Scope1Data with nested relations
type PrismaScope1Data = Prisma.Scope1DataGetPayload<{
  include: {
    stationarySources: {
      include: {
        electricityHeat: true;
        industrialProcesses: true;
        oilGasOperations: true;
      };
    };
    mobileSources: {
      include: {
        roadTransport: true;
        vehicleEquipment: true;
        marineAviation: true;
      };
    };
    processEmissions: {
      include: {
        co2Release: true;
        fertilizerEmissions: true;
        gasFlaring: true;
        entericFermentation: true;
        methaneNitrousOxide: true;
      };
    };
    fugitiveEmissions: {
      include: {
        methaneLeaks: true;
        ventingNaturalGas: true;
        incompleteCombustion: true;
        hfcLeaks: true;
      };
    };
  };
}>;

@Injectable()
export class Scope1Service {
  constructor(private readonly prisma: PrismaService) {}

  // Validate and transform files from JsonValue to File[] | null
  private validateFiles(files: any): File[] | null {
    if (!files) return null;
    if (!Array.isArray(files)) {
      throw new BadRequestException('Files must be an array');
    }
    files.forEach((file: any) => {
      if (!file.url || typeof file.url !== 'string') {
        throw new BadRequestException('Each file must have a valid URL');
      }
      if (file.name && typeof file.name !== 'string') {
        throw new BadRequestException('File name must be a string if provided');
      }
    });
    return files as File[];
  }

  // Transform Prisma output to Scope1Dto
  private transformToScope1Dto(data: PrismaScope1Data): Scope1Dto {
    const transformFiles = (obj: any): any => {
      if (obj?.files) {
        obj.files = this.validateFiles(obj.files);
      }
      return obj;
    };

    // Transform nested relations with null checks
    if (data.stationarySources) {
      transformFiles(data.stationarySources);
      if (data.stationarySources.electricityHeat) {
        transformFiles(data.stationarySources.electricityHeat);
      }
      if (data.stationarySources.industrialProcesses) {
        transformFiles(data.stationarySources.industrialProcesses);
      }
      if (data.stationarySources.oilGasOperations) {
        transformFiles(data.stationarySources.oilGasOperations);
      }
    }
    if (data.mobileSources) {
      transformFiles(data.mobileSources);
      if (data.mobileSources.roadTransport) {
        transformFiles(data.mobileSources.roadTransport);
      }
      if (data.mobileSources.vehicleEquipment) {
        transformFiles(data.mobileSources.vehicleEquipment);
      }
      if (data.mobileSources.marineAviation) {
        transformFiles(data.mobileSources.marineAviation);
      }
    }
    if (data.processEmissions) {
      transformFiles(data.processEmissions);
      if (data.processEmissions.co2Release) {
        transformFiles(data.processEmissions.co2Release);
      }
      if (data.processEmissions.fertilizerEmissions) {
        transformFiles(data.processEmissions.fertilizerEmissions);
      }
      if (data.processEmissions.gasFlaring) {
        transformFiles(data.processEmissions.gasFlaring);
      }
      if (data.processEmissions.entericFermentation) {
        transformFiles(data.processEmissions.entericFermentation);
      }
      if (data.processEmissions.methaneNitrousOxide) {
        transformFiles(data.processEmissions.methaneNitrousOxide);
      }
    }
    if (data.fugitiveEmissions) {
      transformFiles(data.fugitiveEmissions);
      if (data.fugitiveEmissions.methaneLeaks) {
        transformFiles(data.fugitiveEmissions.methaneLeaks);
      }
      if (data.fugitiveEmissions.ventingNaturalGas) {
        transformFiles(data.fugitiveEmissions.ventingNaturalGas);
      }
      if (data.fugitiveEmissions.incompleteCombustion) {
        transformFiles(data.fugitiveEmissions.incompleteCombustion);
      }
      if (data.fugitiveEmissions.hfcLeaks) {
        transformFiles(data.fugitiveEmissions.hfcLeaks);
      }
    }

    return data as Scope1Dto;
  }

  async create(createScope1Dto: CreateScope1Dto): Promise<Scope1Dto> {
    const data = await this.prisma.scope1Data.create({
      data: {
        ghgDataId: createScope1Dto.ghgDataId,
        completed: createScope1Dto.completed ?? false,
      },
      include: {
        stationarySources: {
          include: {
            electricityHeat: true,
            industrialProcesses: true,
            oilGasOperations: true,
          },
        },
        mobileSources: {
          include: {
            roadTransport: true,
            vehicleEquipment: true,
            marineAviation: true,
          },
        },
        processEmissions: {
          include: {
            co2Release: true,
            fertilizerEmissions: true,
            gasFlaring: true,
            entericFermentation: true,
            methaneNitrousOxide: true,
          },
        },
        fugitiveEmissions: {
          include: {
            methaneLeaks: true,
            ventingNaturalGas: true,
            incompleteCombustion: true,
            hfcLeaks: true,
          },
        },
      },
    });
    return this.transformToScope1Dto(data);
  }

  async findAll(): Promise<Scope1Dto[]> {
    const data: PrismaScope1Data[] = await this.prisma.scope1Data.findMany({
      include: {
        stationarySources: {
          include: {
            electricityHeat: true,
            industrialProcesses: true,
            oilGasOperations: true,
          },
        },
        mobileSources: {
          include: {
            roadTransport: true,
            vehicleEquipment: true,
            marineAviation: true,
          },
        },
        processEmissions: {
          include: {
            co2Release: true,
            fertilizerEmissions: true,
            gasFlaring: true,
            entericFermentation: true,
            methaneNitrousOxide: true,
          },
        },
        fugitiveEmissions: {
          include: {
            methaneLeaks: true,
            ventingNaturalGas: true,
            incompleteCombustion: true,
            hfcLeaks: true,
          },
        },
      },
    });
    return data.map((item) => this.transformToScope1Dto(item));
  }

  async findOne(id: number): Promise<Scope1Dto | null> {
    const data = await this.prisma.scope1Data.findUnique({
      where: { id },
      include: {
        stationarySources: {
          include: {
            electricityHeat: true,
            industrialProcesses: true,
            oilGasOperations: true,
          },
        },
        mobileSources: {
          include: {
            roadTransport: true,
            vehicleEquipment: true,
            marineAviation: true,
          },
        },
        processEmissions: {
          include: {
            co2Release: true,
            fertilizerEmissions: true,
            gasFlaring: true,
            entericFermentation: true,
            methaneNitrousOxide: true,
          },
        },
        fugitiveEmissions: {
          include: {
            methaneLeaks: true,
            ventingNaturalGas: true,
            incompleteCombustion: true,
            hfcLeaks: true,
          },
        },
      },
    });
    return data ? this.transformToScope1Dto(data) : null;
  }

  async update(
    id: number,
    updateScope1Dto: UpdateScope1Dto,
  ): Promise<Scope1Dto | null> {
    const data = await this.prisma.scope1Data.update({
      where: { id },
      data: {
        ghgDataId: updateScope1Dto.ghgDataId,
        completed: updateScope1Dto.completed,
      },
      include: {
        stationarySources: {
          include: {
            electricityHeat: true,
            industrialProcesses: true,
            oilGasOperations: true,
          },
        },
        mobileSources: {
          include: {
            roadTransport: true,
            vehicleEquipment: true,
            marineAviation: true,
          },
        },
        processEmissions: {
          include: {
            co2Release: true,
            fertilizerEmissions: true,
            gasFlaring: true,
            entericFermentation: true,
            methaneNitrousOxide: true,
          },
        },
        fugitiveEmissions: {
          include: {
            methaneLeaks: true,
            ventingNaturalGas: true,
            incompleteCombustion: true,
            hfcLeaks: true,
          },
        },
      },
    });
    return this.transformToScope1Dto(data);
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.prisma.scope1Data.delete({ where: { id } });
    return !!result;
  }
}
