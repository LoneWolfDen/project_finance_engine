// Mapping profile fx-rates-v1 (IMP-003). Engine and rules: app/data/mapping.js; list: docs/schema/MAPPING_PROFILES.md.
// Effective-dated FX rates. Dates are YYYY-MM-DD.
CFE.data.mapping.register({
  id: 'fx-rates-v1',
  version: 1,
  sourceSystem: 'FX rates (legacy fx_rates fields)',
  entity: 'fx_rates',
  dropUnmapped: true,
  columns: {
    currency:  { aliases: ['code', 'currency', 'Currency'], type: 'string', required: true },
    effective: { aliases: ['effective', 'Effective Date'], type: 'date', required: true, dateFormat: 'YYYY-MM-DD' },
    rate:      { aliases: ['rate', 'Rate'], type: 'number', required: true }
  }
});
