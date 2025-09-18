export const fuel_types = [
  {
    fuel_type: 'Diesel (AGO)',
    emission_factor: 2.68,
    unit: 'kg CO₂ per Litre (L)',
    standard_sources: [
      'IPCC (2006 Guidelines)',
      'EPA (GHG Emission Factors Hub)',
    ],
  },
  {
    fuel_type: 'Petrol (PMS) / Gasoline',
    emission_factor: 2.31,
    unit: 'kg CO₂ per Litre (L)',
    standard_sources: [
      'IPCC (2006 Guidelines)',
      'EPA (GHG Emission Factors Hub)',
    ],
  },
  {
    fuel_type: 'Natural Gas',
    emission_factor: 2.05,
    unit: 'kg CO₂ per Standard Cubic Meter (scm)',
    standard_sources: ['IEA (Emission Factors 2023)', 'IPCC'],
  },
  {
    fuel_type: 'Low Pour Fuel Oil (LPFO)',
    emission_factor: 3.07,
    unit: 'kg CO₂ per Litre (L)',
    standard_sources: ['IPCC (assumes similar density to residual fuel oil)'],
  },
  {
    fuel_type: 'Heavy Fuel Oil (HFO) / Residual Fuel Oil',
    emission_factor: 3.07,
    unit: 'kg CO₂ per Litre (L)',
    standard_sources: ['IPCC', 'EPA (assumes average density)'],
  },
  {
    fuel_type: 'Coal (Anthracite/Bituminous avg.)',
    emission_factor: 2410,
    unit: 'kg CO₂ per Tonne (t)',
    standard_sources: ['EPA', 'IPCC (Varies significantly by coal type)'],
  },
  {
    fuel_type: 'Biomass (Wood/Wood Waste)',
    emission_factor: 0,
    unit: 'kg CO₂ per Tonne (t)',
    standard_sources: ['IPCC (2006 Guidelines)', 'GHG Protocol'],
  },
];
