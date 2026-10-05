// Date parsing: free-form timesheet/resource dates and PO validity strings.
// Moved verbatim from the legacy index.html by SRC-001 (no logic change; known defect C-01 stays until FIX-001).
// Registers CFE.calc.dates; needs app/cfe.js first.
(function (CFE) {
  'use strict';

  // Parse date: handles dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd, m/d/yyyy
  // format hint: 'uk'=dd/mm/yyyy, 'us'=mm/dd/yyyy, auto=detect
  function parseDate(s,format){
    if(!s)return '';
    s=String(s).trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10); // already ISO
    const parts=s.split(/[\/\-]/);
    if(parts.length===3){
      let a=parseInt(parts[0]),b=parseInt(parts[1]),y=parts[2];
      if(y.length===2)y='20'+y;
      if(y.length===4){
        if(format==='uk')return `${y}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`;
        if(format==='us')return `${y}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`;
        // Auto-detect: if first part > 12, it must be day (dd/mm)
        if(a>12)return `${y}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`;
        // If second part > 12, first must be month (mm/dd)
        if(b>12)return `${y}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`;
        // Ambiguous: default to US (m/d/yyyy) since timesheets are larger dataset
        return `${y}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`;
      }
    }
    const d=new Date(s);
    return isNaN(d)?'':d.toISOString().slice(0,10);
  }

  // Parse PO_Validity "mm-yy" → end-of-month Date; also supports legacy year (2025) and "mm-yyyy"
  function parseValidityEnd(v){
    if(!v)return new Date('2025-12-31');
    const s=String(v).trim();
    if(/^\d{4}$/.test(s))return new Date(parseInt(s),11,31); // legacy: year only
    const parts=s.split('-');
    if(parts.length===2){
      let mm=parseInt(parts[0]),yy=parts[1];
      if(yy.length===2)yy='20'+yy;
      const yr=parseInt(yy);
      return new Date(yr,mm,0); // last day of month mm in year yr
    }
    return new Date('2025-12-31');
  }

  CFE.calc.dates = { parseDate, parseValidityEnd };
})(CFE);
