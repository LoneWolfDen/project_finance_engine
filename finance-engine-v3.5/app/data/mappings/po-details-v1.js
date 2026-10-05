// Mapping profile po-details-v1 (IMP-003). Engine and rules: app/data/mapping.js; list: docs/schema/MAPPING_PROFILES.md.
// Purchase orders. Validity is either mm-yy text (PO_Validity) or a year (PO_Validity_Year); the importer turns it into
// validity_end. Start dates are YYYY-MM-DD.
CFE.data.mapping.register({
  id: 'po-details-v1',
  version: 1,
  sourceSystem: 'PO details (legacy test_PO_Details.json fields)',
  entity: 'purchase_orders',
  dropUnmapped: true,
  columns: {
    po_number:           { aliases: ['PO_WO_Number', 'PO Number'], type: 'string', required: true },
    po_team_identifier:  { aliases: ['PO_Team_Identifier', 'PO Team'], type: 'string', required: true },
    project_id:          { aliases: ['ProjectID', 'Project ID'], type: 'string', required: false },
    value:               { aliases: ['PO_WO_value', 'PO Value'], type: 'number', required: true },
    currency:            { aliases: ['PO_Currency_Code', 'Currency'], type: 'string', required: true },
    normalized_currency: { aliases: ['Normalized_Currency_Code'], type: 'string', required: false },
    validity:            { aliases: ['PO_Validity'], type: 'string', required: false },
    validity_year:       { aliases: ['PO_Validity_Year'], type: 'int', required: false },
    start:               { aliases: ['WO_StartDate', 'Start'], type: 'date', required: true, dateFormat: 'YYYY-MM-DD' },
    approval_status:     { aliases: ['WO_Approval_Status', 'Approval Status'], type: 'string', required: true },
    rollover_allowed:    { aliases: ['rollover_allowed', 'Rollover'], type: 'bool', required: false }
  }
});
