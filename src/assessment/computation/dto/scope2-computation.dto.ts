import { ApiProperty } from "@nestjs/swagger";
import { IsNumber,IsOptional  } from "class-validator";


export class LocationBasedEmissionDto {
    @ApiProperty({
        description: "Total electricity consumed in kilowatt-hours (kWh)",
        example: 100000
    })
    @IsNumber()
    electiricity_consumed: number


    @ApiProperty({
        description: "Emission factor for electricity in Nigeria grid",
        example: 0.45
    })
    @IsNumber()
    @IsOptional()
    electiricity_emission_factor?: number

    
    @ApiProperty({
        description:"Amount of purchased cooling energy consumed"
    })
    @IsNumber()
    amount_of_cooling_energy_consumed: number

     @ApiProperty({
        description: "Emission factor for Amount of purchased cooling energy consumed",
        example: 0.45
    })
    @IsNumber()
    @IsOptional()
    amt_of_c_emission_factor?: number



     @ApiProperty({
        description:"Total steam consumed (tonnes)"
    })
    @IsNumber()
    total_steam_consumed: number

     @ApiProperty({
        description: "Emission factor for Total steam consumed (tonnes)",
        example: 0.45
    })
    @IsNumber()
    @IsOptional()
    total_steam_consumed_factor?: number


       @ApiProperty({
        description:"Total Purchased heating energy consumed (Gigajoules)"
    })
    @IsNumber()
    total_heating_energy_consumed: number

     @ApiProperty({
        description: "Emission factor for Total heating energy consumed (tonnes)",
        example: 0.45
    })
    @IsNumber()
    @IsOptional()
    total_heating_energy_consumed_EF?: number

}


export class MarketBasedEmissionDto {
// Purchased Electricity (from Independent Power Producers – IPPs)
    @ApiProperty({
        description: "Purchased Electricity (from Independent Power Producers – IPPs); Total electricity consumed (kWh)"
    })
    @IsNumber()
    ipp_total_electricity_consumed: number


    @ApiProperty({
        description: "Emission factor for electricity consumed",
        example: 0.45
    })
    @IsNumber()
    @IsOptional()
    ipp_total_electricity_energy_consumed_EF?: number




    // 2 Purchased Electricity (with Energy Attribute Certificates – EACs / RECs)
    @ApiProperty({
        description: "Purchased Electricity (with Energy Attribute Certificates – EACs / RECs in kWh)"
    })
    @IsNumber()
    eac_total_grid_electricity_consumed: number


    @ApiProperty({
        description: "Emission factor for electricity consumed",
        example: 0.45
    })
    @IsNumber()
    @IsOptional()
    eac_total_grid_electricity_consumed_EF?: number


    //3. Purchased Electricity
    @ApiProperty({
        description: "Purchased Electricity (from Independent Power Producers – IPPs); Total purchased electricity consumed (kWh)"
    })
    @IsNumber()
    total_purchased_electricity_consumed: number


    @ApiProperty({
        description: "Emission factor for total purchased and consumed",
        example: 0.45
    })
    @IsNumber()
    @IsOptional()
    total_purchased_electricity_consumed_EF?: number



    // 4.1 Purchased Cooling/Steam
    @ApiProperty({
        description: "Purchased Cooling/Steam"
    })
    @IsNumber()
    purchased_cooling_or_steam_quantity_consumed: number


    @ApiProperty({
        description: "Emission factor for Cooling/Steam",
        example: 0.45
    })
    @IsNumber()
    @IsOptional()
    purchased_cooling_or_steam_quantity_consumed_EF?: number
}