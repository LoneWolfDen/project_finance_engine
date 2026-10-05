// Date parsing: free-form timesheet/resource dates and PO validity strings, and the on-screen date format.
// parseDate and parseValidityEnd were moved verbatim from the legacy index.html by SRC-001 (no logic change;
// known defect C-01 stays until FIX-001). toDisplayDate and fromDisplayDate were added for DEC-040.
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

  // Display format (DEC-040): dates are stored as YYYY-MM-DD and shown as DD-MM-YYYY.
  // toDisplayDate('2025-12-31') → '31-12-2025'. Anything that is not a stored date is returned unchanged.
  function toDisplayDate(v){
    if(v==null)return '';
    const s=String(v).trim();
    const m=/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(s);
    return m?`${m[3]}-${m[2]}-${m[1]}`:s;
  }

  // Reads a date typed or shown on screen back into the stored YYYY-MM-DD form.
  // Accepts DD-MM-YYYY or DD/MM/YYYY (day always first, never guessed) and YYYY-MM-DD.
  // Returns '' for anything else, including impossible dates such as 31-02-2025.
  function fromDisplayDate(v){
    if(v==null)return '';
    const s=String(v).trim();
    let y,mo,d,m;
    if((m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s))){y=+m[1];mo=+m[2];d=+m[3];}
    else if((m=/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/.exec(s))){d=+m[1];mo=+m[2];y=+m[3];}
    else return '';
    if(mo<1||mo>12||d<1||d>new Date(Date.UTC(y,mo,0)).getUTCDate())return '';
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  CFE.calc.dates = { parseDate, parseValidityEnd, toDisplayDate, fromDisplayDate };
})(CFE);
