import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ProcessEmissionDto {
  @ApiProperty({
    description: 'Mass of cement produced in tonnes',
    example: 2000,
  })
  @IsNumber()
  mass_of_cement: number;

@ApiProperty({
    description: 'Emission factor of cement',
    example: 2.5,
  })
  @IsNumber()
  cement_emission_factor: number;


  @ApiProperty({
    description: 'Volume of flared gas in m3',
    example: 2.5,
  })
  @IsNumber()
  volume_of_flared_gas: number;

  @ApiProperty({
    description: 'Emission factor of the gas',
    example: 2.5,
  })
  @IsNumber()
  gas_emission_factor: number;
}
