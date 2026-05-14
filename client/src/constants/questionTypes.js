export const MODULE_TYPES = ['LISTENING', 'READING', 'WRITING', 'SPEAKING']

export const ALLOWED_BY_MODULE = {
  LISTENING: [
    'MULTIPLE_CHOICE',
    'MATCHING',
    'SHORT_ANSWER',
    'SENTENCE_COMPLETION',
    'FORM_COMPLETION',
    'NOTE_COMPLETION',
    'TABLE_COMPLETION',
    'FLOW_CHART_COMPLETION',
    'SUMMARY_COMPLETION',
    'MAP_LABELING',
    'PLAN_LABELING',
    'DIAGRAM_LABELING',
  ],
  READING: [
    'MULTIPLE_CHOICE',
    'TRUE_FALSE_NG',
    'SHORT_ANSWER',
    'SENTENCE_COMPLETION',
    'MATCHING',
    'MATCHING_HEADINGS',
    'FORM_COMPLETION',
    'NOTE_COMPLETION',
    'TABLE_COMPLETION',
    'FLOW_CHART_COMPLETION',
    'SUMMARY_COMPLETION',
    'DIAGRAM_LABELING',
  ],
  WRITING: ['WRITING_TASK1', 'WRITING_TASK2'],
  SPEAKING: ['SPEAKING_PART1', 'SPEAKING_PART2', 'SPEAKING_PART3'],
}

export const QUESTION_TYPE_META = {
  MULTIPLE_CHOICE:       { label: 'Multiple Choice',       icon: 'A' },
  TRUE_FALSE_NG:         { label: 'True/False/NG',         icon: 'T' },
  FILL_BLANK:            { label: 'Fill in Blank',         icon: 'F' },
  SHORT_ANSWER:          { label: 'Short Answer',          icon: 'S' },
  MATCHING:              { label: 'Matching',              icon: 'M' },
  MATCHING_HEADINGS:     { label: 'Matching Headings',     icon: 'H' },
  SENTENCE_COMPLETION:   { label: 'Sentence Completion',   icon: 'C' },
  DIAGRAM_LABELING:      { label: 'Diagram Labelling',     icon: 'D' },
  FORM_COMPLETION:       { label: 'Form Completion',       icon: 'Fm' },
  NOTE_COMPLETION:       { label: 'Note Completion',       icon: 'N' },
  TABLE_COMPLETION:      { label: 'Table Completion',      icon: 'Tb' },
  FLOW_CHART_COMPLETION: { label: 'Flow Chart Completion', icon: 'Fc' },
  SUMMARY_COMPLETION:    { label: 'Summary Completion',    icon: 'Su' },
  MAP_LABELING:          { label: 'Map Labelling',         icon: 'Mp' },
  PLAN_LABELING:         { label: 'Plan Labelling',        icon: 'Pl' },
  WRITING_TASK1:         { label: 'Writing Task 1',        icon: '1' },
  WRITING_TASK2:         { label: 'Writing Task 2',        icon: '2' },
  SPEAKING_PART1:        { label: 'Speaking Part 1',       icon: 'P1' },
  SPEAKING_PART2:        { label: 'Speaking Part 2',       icon: 'P2' },
  SPEAKING_PART3:        { label: 'Speaking Part 3',       icon: 'P3' },
}

export function getAllowedQuestionTypes(moduleType) {
  return ALLOWED_BY_MODULE[moduleType] || []
}
