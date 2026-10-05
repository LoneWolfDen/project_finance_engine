// Mapping profile references-crosswalk-v1 (IMP-003). Engine and rules: app/data/mapping.js; list: docs/schema/MAPPING_PROFILES.md.
// Links each Continuum reference to its PO teams and PeopleSoft project IDs. List cells are separated by ";".
CFE.data.mapping.register({
  id: 'references-crosswalk-v1',
  version: 1,
  sourceSystem: 'Reference crosswalk (maintained by the publisher)',
  entity: 'references',
  dropUnmapped: true,
  columns: {
    ref:                    { aliases: ['ref', 'Reference'], type: 'string', required: true },
    name:                   { aliases: ['name', 'Name'], type: 'string', required: true },
    client:                 { aliases: ['client', 'Client'], type: 'string', required: false },
    opportunity_numbers:    { aliases: ['opportunity_numbers', 'Opportunity Numbers'], type: 'list', required: false, separator: ';' },
    po_team_identifiers:    { aliases: ['po_team_identifiers', 'PO Team Identifiers'], type: 'list', required: false, separator: ';' },
    peoplesoft_project_ids: { aliases: ['peoplesoft_project_ids', 'PeopleSoft Project IDs'], type: 'list', required: false, separator: ';' }
  }
});
