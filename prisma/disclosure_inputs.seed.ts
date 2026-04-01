import { PrismaClient } from '@prisma/client';

export async function seedDisclosureInputs(prisma: PrismaClient) {
  const fuelTypes = [
    { label: 'Diesel (Automotive Gas Oil)', value: 'diesel_ago', factor: 2.68, source: 'IPCC 2006' },
    { label: 'Petrol (Motor Gasoline)', value: 'petrol', factor: 2.31, source: 'IPCC 2006' },
    { label: 'Natural Gas', value: 'natural_gas', factor: 1.9, source: 'IPCC 2006' },
    { label: 'LPG', value: 'lpg', factor: 1.5, source: 'IPCC 2006' },
  ];

  const standardUnits = [
    { label: 'Litre (L)', value: 'litre' },
    { label: 'Cubic Metre (m³)', value: 'm3' },
    { label: 'Kilowatt hour (kWh)', value: 'kwh' },
    { label: 'Gigajoule (GJ)', value: 'gj' },
  ];
}
