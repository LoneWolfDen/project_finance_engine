// Working-day calendar: weekends plus bank holidays by location.
// Moved verbatim from the legacy index.html by SRC-001 (no logic change; known defect C-01 stays until FIX-001).
// Registers CFE.calc.calendar; needs app/cfe.js and app/data/calendars.js first.
(function (CFE) {
  'use strict';

  // Bank holidays by location: app/data/calendars.js (SRC-004; synthetic test data, DEC-017).
  const CALENDARS=CFE.require('data.calendars');
  const HOLIDAYS_BY_LOC=CALENDARS.locations;
  const HOLIDAY_SETS={};Object.entries(HOLIDAYS_BY_LOC).forEach(([k,v])=>{HOLIDAY_SETS[k]=new Set(v);});

  function isWorkingDay(d,location){
    const dow=d.getDay();
    if(dow===0||dow===6)return false;
    const hols=HOLIDAY_SETS[location||'UK']||HOLIDAY_SETS['UK'];
    return !hols.has(d.toISOString().slice(0,10));
  }

  // Whether the holiday calendar covers a year (SRC-004). Outside the covered years only weekends
  // are non-working days, so forecasts for those years are too high (C-07).
  function calendarCoverage(year){
    const y=Number(year);
    return{covered:CALENDARS.valid_years.indexOf(y)>=0,locations:Object.keys(HOLIDAYS_BY_LOC).filter(loc=>HOLIDAYS_BY_LOC[loc].some(d=>Number(d.slice(0,4))===y))};
  }

  CFE.calc.calendar = { HOLIDAYS_BY_LOC, HOLIDAY_SETS, isWorkingDay, calendarCoverage };
})(CFE);
