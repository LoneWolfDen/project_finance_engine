// Actuals: timesheet rows → cost per month / per project, and exact-row de-duplication.
// Moved verbatim from the legacy index.html by SRC-003, except that the cost formula and the per-project
// loop of aggregateActuals are now rowCost and aggregateActualsByProject (no logic change). The
// different cost formula in computeActualsMonthly and the OT handling stay until FIX-003 (U-08).
// Registers CFE.calc.actuals; needs app/cfe.js and app/calc/dates.js, fx.js first.
(function (CFE) {
  'use strict';

  const {parseDate}=CFE.require('calc.dates');
  const {otMultiplier}=CFE.require('calc.fx');

  // Compute actuals from raw timesheet data, filtered by PO_Team
  function computeActualsMonthly(cfg,normFilter,projToTeam){
    if(!cfg.raw_actuals||!cfg.raw_actuals.length)return cfg.actuals_monthly||[];
    const monthly={};
    cfg.raw_actuals.forEach(row=>{
      const projId=parseInt(row['Project ID']||row.project_id||0);
      const team=projToTeam[projId]||'';
      if(normFilter&&!normFilter.includes(team))return;
      const dtRaw=row['Reported Dt']||row.reported_dt||'';
      const dt=parseDate(dtRaw,'us');if(!dt)return;
      const d=new Date(dt);if(isNaN(d.getTime()))return;
      const key=d.toLocaleString('en',{month:'short'})+'-'+String(d.getFullYear()).slice(2);
      const regHrs=parseFloat(row['Regular Hours']||0);
      const otHrs=parseFloat(row['Overtime Hours']||0);
      const emplId=parseInt(row['Empl ID']||0);
      // Find matching resource rule (effective-dated)
      const rule=cfg.resources.find(r=>r.empl_id===emplId&&r.start<=dt&&r.end>=dt)
        ||cfg.resources.find(r=>r.empl_id===emplId);
      const rate=rule?rule.bill_rate:0;
      const hourMult=rule?rule.hour_mult:1;
      const poTeam=rule?(rule.po_team||'').replace(/\s+/g,''):'';
      const otMult=otMultiplier(cfg.ot_params,poTeam,'Overtime_Hours',dt);
      const cost=(regHrs*hourMult*rate)+(otHrs*hourMult*rate*otMult);
      if(!monthly[key])monthly[key]=0;
      monthly[key]+=cost;
    });
    const poVal=(cfg.po_details||[]).reduce((s,p)=>{
      const t=(p.PO_Team_Identifier||'').replace(/\s+/g,'');
      return(normFilter&&!normFilter.includes(t))?s:s+p.PO_WO_value;
    },0);
    let cum=0;
    return Object.entries(monthly).sort((a,b)=>new Date('1 '+a[0])-new Date('1 '+b[0])).map(([m,v])=>{
      cum+=v;return{month:m,actuals:Math.round(v*100)/100,forecast:null,actuals_burn:Math.round((poVal-cum)*100)/100,forecast_burn:null};
    });
  }

  // Cost of one timesheet row with the resource rule in force on dt (latest-effective rule for the
  // employee, else any rule for the employee): (reg × hour_mult × rate) + (OT × hour_mult × rate × OT multiplier).
  // Returns null when no rule matches the employee. This is the formula aggregateActuals used.
  function rowCost(cfg,row,dt){
    const emplId=parseInt(row['Empl ID']||0);
    const rule=cfg.resources.find(r=>r.empl_id===emplId&&r.start<=dt&&r.end>=dt)||cfg.resources.find(r=>r.empl_id===emplId);
    if(!rule)return null;
    const rate=rule.bill_rate;const hm=rule.hour_mult;
    const poTeam=(rule.po_team||'').replace(/\s+/g,'');
    const otMult=otMultiplier(cfg.ot_params,poTeam,'Overtime_Hours',dt);
    const reg=parseFloat(row['Regular Hours']||0);
    const ot=parseFloat(row['Overtime Hours']||0);
    return (reg*hm*rate)+(ot*hm*rate*otMult);
  }

  // Cost per project per month ("Mmm-yy") for timesheet rows; the pure part of the legacy aggregateActuals.
  // Rows without a parseable date are skipped and not counted; rows without a matching rule count as unmatched.
  function aggregateActualsByProject(cfg,rows){
    const byProject={};// {projectID: {month: cost}}
    let matched=0,unmatched=0;
    rows.forEach(row=>{
      const dtRaw=row['Reported Dt']||'';
      const dt=parseDate(dtRaw,'us');if(!dt)return;
      const d=new Date(dt);if(isNaN(d.getTime()))return;
      const key=d.toLocaleString('en',{month:'short'})+'-'+String(d.getFullYear()).slice(2);
      const projId=parseInt(row['Project ID']||0);
      const cost=rowCost(cfg,row,dt);
      if(cost!==null)matched++;else{unmatched++;return;}
      if(!byProject[projId])byProject[projId]={};
      byProject[projId][key]=(byProject[projId][key]||0)+cost;
    });
    return{byProject,matched,unmatched};
  }

  // Fast actuals from pre-computed cache (no re-parsing raw data)
  function computeActualsFromCache(cfg,normFilter,projToTeam){
    const byProject=cfg.actuals_by_project||{};
    const monthly={};
    Object.entries(byProject).forEach(([projId,months])=>{
      const team=projToTeam[parseInt(projId)]||'';
      if(normFilter&&!normFilter.includes(team))return;
      Object.entries(months).forEach(([m,cost])=>{monthly[m]=(monthly[m]||0)+cost;});
    });
    const poVal=(cfg.po_details||[]).reduce((s,p)=>{
      const t=(p.PO_Team_Identifier||'').replace(/\s+/g,'');
      return(normFilter&&!normFilter.includes(t))?s:s+p.PO_WO_value;
    },0);
    let cum=0;
    return Object.entries(monthly).sort((a,b)=>new Date('1 '+a[0])-new Date('1 '+b[0])).map(([m,v])=>{
      cum+=v;return{month:m,actuals:Math.round(v*100)/100,actuals_burn:Math.round((poVal-cum)*100)/100};
    });
  }

  // DAT-006 (DEC-016): only rows identical in every column are duplicates. The key is every column,
  // in sorted order, with trimmed values (the column name is included so different column sets never collide).
  function actualsRowKey(row){return Object.keys(row).sort().map(k=>k+'\u001e'+String(row[k]==null?'':row[k]).trim()).join('\u001f');}
  function deduplicateActuals(cfg){
    if(!cfg.raw_actuals||!cfg.raw_actuals.length)return cfg;
    const seen=new Map();
    cfg.raw_actuals.forEach(row=>{
      const key=actualsRowKey(row);
      if(!seen.has(key))seen.set(key,row);
    });
    const before=cfg.raw_actuals.length;
    cfg.raw_actuals=[...seen.values()];
    const removed=before-cfg.raw_actuals.length;
    if(removed>0)console.log(`Dedup: removed ${removed} duplicate actuals (${before}→${cfg.raw_actuals.length})`);
    return{cfg,removed};
  }

  CFE.calc.actuals = { computeActualsMonthly, rowCost, aggregateActualsByProject, computeActualsFromCache, actualsRowKey, deduplicateActuals };
})(CFE);
