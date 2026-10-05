// Mapping profile invoices-v1 (IMP-003). Engine and rules: app/data/mapping.js; list: docs/schema/MAPPING_PROFILES.md.
// Invoices raised against a PO team. Dates are YYYY-MM-DD.
CFE.data.mapping.register({
  id: 'invoices-v1',
  version: 1,
  sourceSystem: 'Invoices (legacy test_Invoices.json fields)',
  entity: 'invoices',
  dropUnmapped: true,
  columns: {
    invoice_number:     { aliases: ['invoice_number', 'Invoice Number'], type: 'string', required: true },
    po_team_identifier: { aliases: ['po_team', 'PO_Team_Identifier'], type: 'string', required: true },
    period_from:        { aliases: ['period_from', 'Period From'], type: 'date', required: true, dateFormat: 'YYYY-MM-DD' },
    period_to:          { aliases: ['period_to', 'Period To'], type: 'date', required: true, dateFormat: 'YYYY-MM-DD' },
    amount:             { aliases: ['amount', 'Amount'], type: 'number', required: true },
    currency:           { aliases: ['currency', 'Currency'], type: 'string', required: false },
    status:             { aliases: ['status', 'Status'], type: 'string', required: true },
    paid_date:          { aliases: ['paid_date', 'Paid Date'], type: 'date', required: false, dateFormat: 'YYYY-MM-DD' },
    notes:              { aliases: ['notes', 'Notes'], type: 'string', required: false }
  }
});
