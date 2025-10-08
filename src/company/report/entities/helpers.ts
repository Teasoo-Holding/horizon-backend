export function calculateScope2Total(scope2Data: any): {
  total: number;
  components: any;
  error?: any;
} {
  const components = {
    marketBased: 0,
    locationBased: 0,
    breakdown: {
      marketBased: {} as any,
      locationBased: {} as any,
    },
  };

  try {
    // Market-based calculation
    if (scope2Data?.marketBased) {
      const mb = scope2Data.marketBased;

      if (mb.sum !== null && mb.sum !== undefined) {
        components.marketBased = mb.sum;
        components.breakdown.marketBased = { usedSum: true, value: mb.sum };
      } else {
        // Calculate from individual components
        components.marketBased =
          (mb.eac?.value || 0) +
          (mb.ipp?.value || 0) +
          (mb.residual?.value || 0) +
          (mb.coolingSteam?.value || 0);

        components.breakdown.marketBased = {
          eac: mb.eac?.value || 0,
          ipp: mb.ipp?.value || 0,
          residual: mb.residual?.value || 0,
          coolingSteam: mb.coolingSteam?.value || 0,
          usedSum: false,
        };
      }
    }

    // Location-based calculation
    if (scope2Data?.locationBased) {
      const lb = scope2Data.locationBased;

      if (lb.sum !== null && lb.sum !== undefined) {
        components.locationBased = lb.sum;
        components.breakdown.locationBased = { usedSum: true, value: lb.sum };
      } else {
        // Calculate from individual components (excluding null values)
        components.locationBased =
          (lb.electricity_consumed?.value || 0) +
          (lb.total_steam_consumed?.value || 0) +
          (lb.total_heating_energy_consumed?.value || 0) +
          (lb.amount_of_cooling_energy_consumed?.value || 0);

        components.breakdown.locationBased = {
          electricity_consumed: lb.electricity_consumed?.value || 0,
          total_steam_consumed: lb.total_steam_consumed?.value || 0,
          total_heating_energy_consumed:
            lb.total_heating_energy_consumed?.value || 0,
          amount_of_cooling_energy_consumed:
            lb.amount_of_cooling_consumed?.value || 0,
          usedSum: false,
        };
      }
    }

    return {
      total: components.marketBased + components.locationBased,
      components,
    };
  } catch (error) {
    console.error('Error calculating scope 2 total:', error);
    return {
      total: 0,
      components,
      error: 'Calculation failed',
    };
  }
}



export function calculateScope1Total(breakdownData: any): { total: number; components: any; errors: string[] } {
  const errors: string[] = [];
  const components = {
    mobileSources: 0,
    processEmissions: 0,
    fugitiveEmissions: 0,
    stationarySources: 0,
    breakdown: {
      mobileSources: {} as any,
      processEmissions: {} as any,
      fugitiveEmissions: {} as any,
      stationarySources: {} as any
    }
  };

  try {
    // 1. Mobile Sources
    if (breakdownData?.mobileSources) {
      const ms = breakdownData.mobileSources;
      
      if (ms.sum !== null && ms.sum !== undefined && typeof ms.sum === 'number') {
        components.mobileSources = ms.sum;
        components.breakdown.mobileSources = { usedSum: true, value: ms.sum };
      } else {
        // Fallback: sum individual mobile source components
        components.mobileSources = 
          (ms.helocopters?.value || 0) +
          (ms.diesel_truck?.value || 0) +
          (ms.cars_and_buses?.value || 0) +
          (ms.boats_and_vessels?.value || 0) +
          (ms.heavy_duty_vehicles?.value || 0) +
          (ms.forklifts_and_other_machinery?.value || 0) +
          (ms.tractor_and_other_machineries?.value || 0);
        
        components.breakdown.mobileSources = {
          helocopters: ms.helocopters?.value || 0,
          diesel_truck: ms.diesel_truck?.value || 0,
          cars_and_buses: ms.cars_and_buses?.value || 0,
          boats_and_vessels: ms.boats_and_vessels?.value || 0,
          heavy_duty_vehicles: ms.heavy_duty_vehicles?.value || 0,
          forklifts_and_other_machinery: ms.forklifts_and_other_machinery?.value || 0,
          tractor_and_other_machineries: ms.tractor_and_other_machineries?.value || 0,
          usedSum: false
        };

        if (ms.sum === undefined || ms.sum === null) {
          errors.push('Mobile Sources: Using component sum (main sum not available)');
        }
      }
    } else {
      errors.push('Mobile Sources: Data not found');
    }

    // 2. Process Emissions
    if (breakdownData?.processEmissions) {
      const pe = breakdownData.processEmissions;
      
      if (pe.sum !== null && pe.sum !== undefined && typeof pe.sum === 'number') {
        components.processEmissions = pe.sum;
        components.breakdown.processEmissions = { usedSum: true, value: pe.sum };
      } else {
        // Fallback: sum individual process emission components
        components.processEmissions = 
          (pe.cement || 0) +
          (pe.flaring || 0);
        
        components.breakdown.processEmissions = {
          cement: pe.cement || 0,
          flaring: pe.flaring || 0,
          usedSum: false
        };

        if (pe.sum === undefined || pe.sum === null) {
          errors.push('Process Emissions: Using component sum (main sum not available)');
        }
      }
    } else {
      errors.push('Process Emissions: Data not found');
    }

    // 3. Fugitive Emissions
    if (breakdownData?.fugitiveEmissions) {
      const fe = breakdownData.fugitiveEmissions;
      
      if (fe.sum !== null && fe.sum !== undefined && typeof fe.sum === 'number') {
        components.fugitiveEmissions = fe.sum;
        components.breakdown.fugitiveEmissions = { usedSum: true, value: fe.sum };
      } else {
        // Fallback: use venting value
        components.fugitiveEmissions = fe.venting || 0;
        components.breakdown.fugitiveEmissions = {
          venting: fe.venting || 0,
          usedSum: false
        };

        if (fe.sum === undefined || fe.sum === null) {
          errors.push('Fugitive Emissions: Using venting value (main sum not available)');
        }
      }
    } else {
      errors.push('Fugitive Emissions: Data not found');
    }

    // 4. Stationary Sources
    if (breakdownData?.stationarySources) {
      const ss = breakdownData.stationarySources;
      
      if (ss.sum !== null && ss.sum !== undefined && typeof ss.sum === 'number') {
        components.stationarySources = ss.sum;
        components.breakdown.stationarySources = { usedSum: true, value: ss.sum };
      } else {
        // Fallback: sum individual stationary source components
        components.stationarySources = 
          (ss.gas_powered_turbine?.value || 0) +
          (ss.fuel_powered_generator?.value || 0) +
          (ss.boilers_and_furnaces_in_manufacturing?.value || 0) +
          (ss.heaters_and_boilers_at_oil_production_facilities?.value || 0);
        
        components.breakdown.stationarySources = {
          gas_powered_turbine: ss.gas_powered_turbine?.value || 0,
          fuel_powered_generator: ss.fuel_powered_generator?.value || 0,
          boilers_and_furnaces_in_manufacturing: ss.boilers_and_furnaces_in_manufacturing?.value || 0,
          heaters_and_boilers_at_oil_production_facilities: ss.heaters_and_boilers_at_oil_production_facilities?.value || 0,
          usedSum: false
        };

        if (ss.sum === undefined || ss.sum === null) {
          errors.push('Stationary Sources: Using component sum (main sum not available)');
        }
      }
    } else {
      errors.push('Stationary Sources: Data not found');
    }

    const total = 
      components.mobileSources + 
      components.processEmissions + 
      components.fugitiveEmissions + 
      components.stationarySources;

    return {
      total,
      components,
      errors
    };

  } catch (error) {
    const errorMsg = `Error calculating scope 1 total: ${error.message}`;
    errors.push(errorMsg);
    
    return {
      total: 0,
      components,
      errors
    };
  }
}


export function getPercentage(part:number, whole:number) {
  if (whole === 0) return 0; 
  return (part / whole) * 100;
}







type FuelItem = {
  fuelType: string;
  volume: number;
};

type Assessment = {
  assessmentData?: Record<string, any>;
};


function extractFuelData(assessment: Assessment): FuelItem[] {
  const data = assessment.assessmentData;
  if (!data) return [];

  const results: FuelItem[] = [];

  // Helper to walk through nested objects
  function walk(obj: any) {
    if (!obj || typeof obj !== "object") return;

    // If it's an array, iterate
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }

    // If object has both fuelType and volume, collect it
    if ("fuelType" in obj && "volume" in obj) {
      const volume = parseFloat(obj.volume);
      if (!isNaN(volume)) {
        results.push({ fuelType: obj.fuelType, volume });
      }
    }

    // Recurse into nested keys
    Object.values(obj).forEach(walk);
  }

  walk(data);
  return results;
}

export function getTop5ByFuelType(assessment: Assessment) {
  const fuelData = extractFuelData(assessment);

  if (fuelData.length === 0) return [];

  // Group volumes by fuelType
  const totals = fuelData.reduce<Record<string, number>>((acc, item) => {
    acc[item.fuelType] = (acc[item.fuelType] || 0) + item.volume;
    return acc;
  }, {});

  // Compute total sum for percentages
  const totalVolume = Object.values(totals).reduce((a, b) => a + b, 0);

  // Sort and take top 5
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([fuelType, volume]) => ({
      fuelType,
      volume,
      percentage: Number(((volume / totalVolume) * 100).toFixed(2)),
    }));
}




type FuelEntry = {
  fuelType: string;
  volume: number;
  emissionFactor: number;
  scope: string;
};

type ScopeBreakdown = {
  [key: string]: {
    value?: number;
  };
};

interface AssessmentData {
  totals?: {
    totals?: {
      breakdown?: {
        scope2?: {
          marketBased?: ScopeBreakdown;
          locationBased?: ScopeBreakdown;
        };
      };
    };
  };
  [key: string]: any;
}

export function extractFuelMixBreakdown(assessmentData: AssessmentData) {
  const results: FuelEntry[] = [];

  function collectFuelData(obj: any, scope: string): void {
    if (!obj || typeof obj !== "object") return;

    // Handle arrays
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (item?.fuelType && item?.volume && item?.emissionFactor) {
          results.push({
            fuelType: String(item.fuelType),
            volume: Number(item.volume),
            emissionFactor: Number(item.emissionFactor),
            scope,
          });
        } else {
          collectFuelData(item, scope);
        }
      }
      return;
    }

    // Handle nested objects
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.includes("stationary") ||
        lowerKey.includes("mobile") ||
        lowerKey.includes("process") ||
        lowerKey.includes("fugitive")
      ) {
        collectFuelData(value, "Scope 1");
      } else if (
        ["electricity", "heating", "cooling", "steam", "residual", "eac", "ipps"].includes(lowerKey)
      ) {
        collectFuelData(value, "Scope 2");
      } else {
        collectFuelData(value, scope);
      }
    }
  }

  // 🔹 Step 1: Collect Scope 1 data recursively
  collectFuelData(assessmentData, "Scope 1");

  // 🔹 Step 2: Add aggregated Scope 2 totals if available
  const scope2Data =
    assessmentData?.totals?.totals?.breakdown?.scope2?.marketBased ??
    assessmentData?.totals?.totals?.breakdown?.scope2?.locationBased;

  if (scope2Data && typeof scope2Data === "object") {
    for (const [key, val] of Object.entries(scope2Data)) {
      if (key === "sum" || !val || typeof val !== "object") continue;
      const emissionValue = Number((val as any).value);
      if (!isNaN(emissionValue) && emissionValue > 0) {
        results.push({
          fuelType: key,
          volume: 1, // since it's an aggregate, treat as 1 unit
          emissionFactor: emissionValue,
          scope: "Scope 2",
        });
      }
    }
  }

  // 🔹 Step 3: Group by fuelType + scope
  const grouped: Record<string, Record<string, number>> = {};

  for (const item of results) {
    const emission = item.volume * item.emissionFactor;
    if (!grouped[item.fuelType]) grouped[item.fuelType] = {};
    grouped[item.fuelType][item.scope] =
      (grouped[item.fuelType][item.scope] || 0) + emission;
  }

  // 🔹 Step 4: Format for chart
  return Object.entries(grouped).map(([fuelType, scopes]) => ({
    fuelType,
    scope1: scopes["Scope 1"] || 0,
    scope2: scopes["Scope 2"] || 0,
    scope3: scopes["Scope 3"] || 0,
    total: Object.values(scopes).reduce((a, b) => a + b, 0),
  }));
}


export function sumScope2Values(scope2) {
    let total = 0;

    // Sum marketBased values
    for (const key in scope2.marketBased) {
        const item = scope2.marketBased[key];
        if (item && typeof item === 'object' && 'value' in item && item.value !== null) {
            total += item.value;
        }
    }

    // Sum locationBased values
    for (const key in scope2.locationBased) {
        const item = scope2.locationBased[key];
        if (item && typeof item === 'object' && 'value' in item && item.value !== null) {
            total += item.value;
        }
    }

    return total;
}


export function sumScope1Values(scope1) {
    let total = 0;

    // Sum mobileSources values
    for (const key in scope1.mobileSources) {
        const item = scope1.mobileSources[key];
        if (item && typeof item === 'object' && 'value' in item && item.value !== null) {
            total += item.value;
        }
    }

    // Sum processEmissions - note: these are direct numeric values, not objects with 'value' property
    if (scope1.processEmissions) {
        if (typeof scope1.processEmissions.cement === 'number') {
            total += scope1.processEmissions.cement;
        }
        if (typeof scope1.processEmissions.flaring === 'number') {
            total += scope1.processEmissions.flaring;
        }
    }

    // Sum fugitiveEmissions - these are also direct numeric values
    if (scope1.fugitiveEmissions) {
        if (typeof scope1.fugitiveEmissions.hfc === 'number') {
            total += scope1.fugitiveEmissions.hfc;
        }
        if (typeof scope1.fugitiveEmissions.venting === 'number') {
            total += scope1.fugitiveEmissions.venting;
        }
    }

    // Sum stationarySources values
    for (const key in scope1.stationarySources) {
        const item = scope1.stationarySources[key];
        if (item && typeof item === 'object' && 'value' in item && item.value !== null) {
            total += item.value;
        }
    }

    return total;
}