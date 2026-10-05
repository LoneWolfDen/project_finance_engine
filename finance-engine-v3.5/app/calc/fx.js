// Effective-dated lookups: FX rates and overtime multipliers.
// Moved verbatim from the legacy index.html by SRC-001 (no logic change; known defect C-01 stays until FIX-001).
// Registers CFE.calc.fx; needs app/cfe.js first.
(function (CFE) {
  'use strict';

  // Effective-dated FX lookup: latest rate on or before asOfDate
  function fxRateAsOf(fxRates,code,asOfDate){
    let best=null,bestDt='';
    fxRates.forEach(r=>{if(r.code===code&&r.effective<=asOfDate&&r.effective>bestDt){best=r.rate;bestDt=r.effective;}});
    return best||1;
  }

  // OT multiplier lookup
  function otMultiplier(otParams,poTeam,otType,asOfDate){
    let best=null,bestDt='';
    otParams.forEach(r=>{if(r.type===otType&&r.effective<=asOfDate&&r.effective>bestDt){best=r.multiplier;bestDt=r.effective;}});
    return best||1;
  }

  CFE.calc.fx = { fxRateAsOf, otMultiplier };
})(CFE);
