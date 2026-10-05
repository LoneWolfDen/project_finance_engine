// Mapping profile peoplesoft-timesheet-v1 (IMP-003). Engine and rules: app/data/mapping.js; list: docs/schema/MAPPING_PROFILES.md.
// Timesheet rows. Dates are month/day/year (DEC-018-R1). Kept: who, when, which project, activity and the hours worked.
// Dropped at import (minimisation, ADR-016): worksite city/state/country/postal, customer and project
// names, business unit, week ending, status, bill indicator, and vacation/personal hours.
CFE.data.mapping.register({
  id: 'peoplesoft-timesheet-v1',
  version: 1,
  sourceSystem: 'PeopleSoft (timesheet query export)',
  entity: 'timesheet_rows',
  dropUnmapped: true,
  columns: {
    employee_id:    { aliases: ['Empl ID', 'EmplID'], type: 'string', required: true },
    employee_name:  { aliases: ['Empl Name', 'EmplName'], type: 'string', required: true },
    reported_date:  { aliases: ['Reported Dt', 'Reported Date'], type: 'date', required: true, dateFormat: 'M/D/YYYY' },
    project_id:     { aliases: ['Project ID', 'ProjectID'], type: 'string', required: true },
    activity:       { aliases: ['Activity'], type: 'string', required: false },
    regular_hours:  { aliases: ['Regular Hours'], type: 'number', required: true },
    overtime_hours: { aliases: ['Overtime Hours'], type: 'number', required: false },
    other_hours:    { aliases: ['Other'], type: 'number', required: false },
    total_hours:    { aliases: ['Total Hours'], type: 'number', required: false }
  }
});
