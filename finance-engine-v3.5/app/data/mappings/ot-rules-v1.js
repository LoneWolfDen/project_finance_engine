// Mapping profile ot-rules-v1 (IMP-003). Engine and rules: app/data/mapping.js; list: docs/schema/MAPPING_PROFILES.md.
// Effective-dated overtime multipliers by hours type. Dates are YYYY-MM-DD.
CFE.data.mapping.register({
  id: 'ot-rules-v1',
  version: 1,
  sourceSystem: 'Overtime rules (legacy ot_params fields)',
  entity: 'ot_rules',
  dropUnmapped: true,
  columns: {
    type:       { aliases: ['type', 'Hours Type'], type: 'string', required: true },
    effective:  { aliases: ['effective', 'Effective Date'], type: 'date', required: true, dateFormat: 'YYYY-MM-DD' },
    multiplier: { aliases: ['multiplier', 'Multiplier'], type: 'number', required: true },
    trc:        { aliases: ['trc', 'TRC'], type: 'string', required: false }
  }
});
