// Mapping profile expenses-v1 (IMP-003). Engine and rules: app/data/mapping.js; list: docs/schema/MAPPING_PROFILES.md.
// Expense claims. Dates are YYYY-MM-DD; the currency is kept as claimed.
CFE.data.mapping.register({
  id: 'expenses-v1',
  version: 1,
  sourceSystem: 'Expenses (legacy test_Expenses.json fields)',
  entity: 'expenses',
  dropUnmapped: true,
  columns: {
    employee_name:      { aliases: ['name', 'Empl Name'], type: 'string', required: true },
    date:               { aliases: ['date', 'Date'], type: 'date', required: true, dateFormat: 'YYYY-MM-DD' },
    amount:             { aliases: ['amount', 'Amount'], type: 'number', required: true },
    currency:           { aliases: ['currency', 'Currency'], type: 'string', required: true },
    description:        { aliases: ['desc', 'description', 'Description'], type: 'string', required: false },
    project_id:         { aliases: ['projectID', 'Project ID'], type: 'string', required: false },
    po_team_identifier: { aliases: ['po_team', 'PO_Team_Identifier'], type: 'string', required: false }
  }
});
