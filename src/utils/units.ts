export type Unit = 'mm' | 'imperial';

export const formatMeasurement = (mm: number, unit?: Unit): string => {
  if (unit === 'imperial') {
    const totalInches = mm * 0.03937007874;
    if (totalInches === 0) return '0"';
    
    const isNegative = totalInches < 0;
    const absTotalInches = Math.abs(totalInches);
    let feet = Math.floor(absTotalInches / 12);
    let remainingInches = absTotalInches - (feet * 12);
    let wholeInches = Math.floor(remainingInches);
    let fraction = Math.round((remainingInches - wholeInches) * 16);
    
    if (fraction === 16) {
      wholeInches += 1;
      fraction = 0;
    }
    if (wholeInches >= 12) {
      feet += Math.floor(wholeInches / 12);
      wholeInches = wholeInches % 12;
    }

    let fractionStr = '';
    if (fraction > 0) {
      let num = fraction;
      let den = 16;
      while (num % 2 === 0 && den % 2 === 0) {
        num /= 2;
        den /= 2;
      }
      
      fractionStr = `-${num}/${den}`;
    }

    let lengthStr = '';
    if (feet > 0) {
      lengthStr = `${feet}' ${wholeInches}${fractionStr}"`;
    } else {
      if (wholeInches === 0 && fractionStr !== '') {
        lengthStr = `${fractionStr.substring(1)}"`;
      } else {
        lengthStr = `${wholeInches}${fractionStr}"`;
      }
    }

    return isNegative ? `-${lengthStr}` : lengthStr;
  }
  return mm.toFixed(0) + " mm";
};
