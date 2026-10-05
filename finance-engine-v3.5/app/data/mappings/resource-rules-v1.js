// Mapping profile resource-rules-v1 (IMP-003). Engine and rules: app/data/mapping.js; list: docs/schema/MAPPING_PROFILES.md.
// Resource rules: who is billed at which rate, for which PO team and period. Dates are day/month/year (DEC-018-R1);
// the owner confirms this on one live file at checkpoint F1.5.
CFE.data.mapping.register({
  id: 'resource-rules-v1',
  version: 1,
  sourceSystem: 'Resource rules (rate card export)',
  entity: 'resource_rules',
  dropUnmapped: true,
  columns: {
    employee_name:      { aliases: ['Empl Name', 'EmplName', 'Name'], type: 'string', required: true },
    employee_id:        { aliases: ['EmplID', 'Empl ID'], type: 'string', required: true },
    project_id:         { aliases: ['ProjectID', 'Project ID'], type: 'string', required: false },
    po_team_identifier: { aliases: ['PO_Team_Identifier', 'PO Team'], type: 'string', required: true },
    role:               { aliases: ['Role'], type: 'string', required: false },
    location:           { aliases: ['Location'], type: 'string', required: true },
    start:              { aliases: ['RateEffectiveDt', 'Start'], type: 'date', required: true, dateFormat: 'D/M/YYYY' },
    end:                { aliases: ['ContractEndDt', 'End'], type: 'date', required: true, dateFormat: 'D/M/YYYY' },
    bill_rate:          { aliases: ['BillRate', 'Bill Rate'], type: 'number', required: true },
    hour_multiplier:    { aliases: ['HourMultiplier_TimeEntry', 'Hour Multiplier'], type: 'number', required: false },
    allocation:         { aliases: ['Allocation_Percentage', 'Allocation'], type: 'number', required: true }
  }
});
