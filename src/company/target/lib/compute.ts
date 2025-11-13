export function sumAllValues(obj: any): number {
  let sum = 0;

  function traverse(currentObj: any) {
    if (typeof currentObj !== 'object' || currentObj === null) {
      return;
    }

    for (const key in currentObj) {
      if (currentObj.hasOwnProperty(key)) {
        const value = currentObj[key];
        
        if (key === 'value' && typeof value === 'number') {
          sum += value;
        } else if (typeof value === 'object' && value !== null) {
          traverse(value);
        }
      }
    }
  }

  traverse(obj);
  
  return Number(sum.toFixed(2));
}


export function scope1EmissionSum(data: any) {
  const categories = [
    "mobileSources",
    "processEmissions",
    "fugitiveEmissions",
    "stationarySources",
  ];

  let total = 0;

  for (const key of categories) {
    const section = data[key];

    if (section && typeof section.sum === "number") {
      total += section.sum;
    }
  }

  return Number(total.toFixed(2));
}
