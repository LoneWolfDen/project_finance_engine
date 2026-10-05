// Forecast: spend forecast from resource rules (monthly, burndown, rollover) and per PO team.
// Moved verbatim from the legacy index.html by SRC-002 (no logic change; known defect C-01 stays until FIX-001).
// Registers CFE.calc.forecast; needs app/cfe.js and app/calc/dates.js, calendar.js, fx.js first.
(function (CFE) {
  'use strict';

  const {parseValidityEnd}=CFE.require('calc.dates');
  const {isWorkingDay}=CFE.require('calc.calendar');
  const {fxRateAsOf}=CFE.require('calc.fx');

  function computeForecast(cfg,filterPoTeams,asOf){
    const poArr=cfg.po_details;
    const poByTeam={};
    poArr.forEach(po=>{
      const key=(po.PO_Team_Identifier||'').replace(/\s+/g,'');
      const endDt=parseValidityEnd(po.PO_Validity||po.PO_Validity_Year);
      if(!poByTeam[key])poByTeam[key]={PO_WO_value:0,maxEnd:new Date(0),WO_StartDate:'9999-12-31',PO_Currency_Code:po.PO_Currency_Code,Normalized_Currency_Code:po.Normalized_Currency_Code,WO_Approval_Status:po.WO_Approval_Status,PO_Team_Identifier:key,pos:[],rollover_allowed:false};
      poByTeam[key].PO_WO_value+=po.PO_WO_value;
      if(endDt>poByTeam[key].maxEnd)poByTeam[key].maxEnd=endDt;
      if(po.WO_StartDate<poByTeam[key].WO_StartDate)poByTeam[key].WO_StartDate=po.WO_StartDate;
      if(po.rollover_allowed)poByTeam[key].rollover_allowed=true;
      poByTeam[key].pos.push(po);
    });

    const normFilter=filterPoTeams&&filterPoTeams.length?filterPoTeams.map(t=>t.replace(/\s+/g,'')):null;
    const activeTeams=normFilter||Object.keys(poByTeam);
    const activePOs=activeTeams.map(t=>poByTeam[t]).filter(Boolean);

    const totalPOValue=activePOs.reduce((s,p)=>s+p.PO_WO_value,0);
    const maxEnd=activePOs.reduce((m,p)=>p.maxEnd>m?p.maxEnd:m,new Date(0));
    const earliestStart=activePOs.reduce((m,p)=>(p.WO_StartDate&&p.WO_StartDate<m)?p.WO_StartDate:m,'9999-12-31');
    const currency=activePOs[0]||{PO_Currency_Code:'GBP',Normalized_Currency_Code:'USD'};

    const poStart=new Date(earliestStart!=='9999-12-31'?earliestStart:'2025-01-01');
    const poEnd=maxEnd>new Date(0)?maxEnd:new Date('2025-12-31');
    const daily={};
    const STD_HOURS=8;

    const resources=cfg.resources.filter(r=>{
      const rTeam=(r.po_team||'').replace(/\s+/g,'');
      return normFilter?normFilter.includes(rTeam):true;
    });

    resources.forEach(r=>{
      if(!r.bill_rate)return;
      const rTeam=(r.po_team||'').replace(/\s+/g,'');
      const teamPO=poByTeam[rTeam];
      const teamEnd=teamPO?teamPO.maxEnd:poEnd;
      const rStart=new Date(Math.max(new Date(r.start),poStart));
      const rEnd=new Date(Math.min(new Date(r.end),teamEnd));
      if(rStart>rEnd||isNaN(rStart.getTime())||isNaN(rEnd.getTime()))return;
      const dailyCost=r.bill_rate*r.alloc*STD_HOURS;
      let d=new Date(rStart);
      while(d<=rEnd){
        if(isWorkingDay(d,r.location)){const k=d.toISOString().slice(0,10);daily[k]=(daily[k]||0)+dailyCost;}
        d=new Date(d.getTime()+86400000);
      }
    });

    const monthly={};
    Object.entries(daily).sort().forEach(([d,c])=>{
      const dt=new Date(d);
      const key=dt.toLocaleString('en',{month:'short'})+'-'+String(dt.getFullYear()).slice(2);
      monthly[key]=(monthly[key]||0)+c;
    });

    let remFc=totalPOValue;
    const burndown=Object.entries(monthly).map(([m,c])=>{remFc-=c;return{month:m,forecast:Math.round(c*100)/100,forecast_burn:Math.round(remFc*100)/100};});
    const total=Object.values(monthly).reduce((a,b)=>a+b,0);
    const days=Object.keys(daily).length;

    const today=asOf||new Date().toISOString().slice(0,10); // SRC-002: asOf (YYYY-MM-DD) is optional
    let normPO=0;
    activePOs.forEach(p=>{
      const fxFrom=fxRateAsOf(cfg.fx_rates,p.PO_Currency_Code,today);
      const fxTo=fxRateAsOf(cfg.fx_rates,p.Normalized_Currency_Code||'USD',today);
      normPO+=(p.PO_WO_value/fxFrom)*fxTo;
    });

    // Multi-year PO rollover (only for POs with rollover_allowed=true)
    // Group POs by validity end year
    const posByYear={};
    activePOs.forEach(team=>{team.pos.forEach(po=>{
      if(normFilter&&!normFilter.includes((po.PO_Team_Identifier||'').replace(/\s+/g,'')))return;
      const endDt=parseValidityEnd(po.PO_Validity||po.PO_Validity_Year);
      const yr=endDt.getFullYear();
      if(!posByYear[yr])posByYear[yr]=[];
      posByYear[yr].push(po);
    });});
    const spendByYear={};
    Object.entries(daily).forEach(([d,c])=>{const yr=parseInt(d.slice(0,4));spendByYear[yr]=(spendByYear[yr]||0)+c;});
    const years=Object.keys(posByYear).map(Number).sort();
    const rolloverByYear={};
    let carryForward=0;
    years.forEach(yr=>{
      const yrPOs=posByYear[yr];
      const yrPOValue=yrPOs.reduce((s,p)=>s+p.PO_WO_value,0);
      const available=yrPOValue+carryForward;
      const spent=spendByYear[yr]||0;
      const unused=Math.max(0,available-spent);
      const anyRollover=yrPOs.some(p=>p.rollover_allowed);
      rolloverByYear[yr]={poValue:yrPOValue,carryIn:carryForward,available,spent:Math.round(spent*100)/100,unused:Math.round(unused*100)/100,rollover_allowed:anyRollover};
      // Only carry forward if rollover is allowed for this year's POs
      carryForward=anyRollover?unused:0;
    });

    return{monthly,burndown,total:Math.round(total*100)/100,days,rate:days?Math.round(total/days*100)/100:0,normPO:Math.round(normPO*100)/100,totalPOValue,currency:currency.PO_Currency_Code,normCurrency:currency.Normalized_Currency_Code||'USD',status:currency.WO_Approval_Status||'Approved',rolloverByYear,posByYear};
  }

  // Forecast cost per PO team, bounded by the team's PO validity end (moved verbatim from the legacy rOV).
  function forecastPerTeam(cfg){
    const D={cfg};
    // Compute PO validity end per team for bounding forecast
    const teamValidityEnd={};
    (D.cfg.po_details||[]).forEach(p=>{
      const t=(p.PO_Team_Identifier||'').replace(/\s+/g,'');
      const endDt=parseValidityEnd(p.PO_Validity||p.PO_Validity_Year);
      if(!teamValidityEnd[t]||endDt>teamValidityEnd[t])teamValidityEnd[t]=endDt;
    });
    const fcPerTeam={};
    D.cfg.resources.forEach(r=>{
      if(!r.bill_rate)return;
      const t=(r.po_team||'').replace(/\s+/g,'');
      if(!fcPerTeam[t])fcPerTeam[t]=0;
      const rStart=new Date(r.start);
      const poEnd=teamValidityEnd[t]||new Date(r.end);
      const rEnd=new Date(Math.min(new Date(r.end),poEnd));
      if(isNaN(rStart)||isNaN(rEnd)||rStart>rEnd)return;
      const dailyCost=r.bill_rate*r.alloc*8;
      let d=new Date(rStart);
      while(d<=rEnd){if(isWorkingDay(d,r.location))fcPerTeam[t]+=dailyCost;d=new Date(d.getTime()+86400000);}
    });
    return fcPerTeam;
  }

  CFE.calc.forecast = { computeForecast, forecastPerTeam };
})(CFE);
