import type { RfsDocument } from './rfs-detail';
import type { PreAnalysisResult } from './pre-analysis';

// POC FIXTURE ONLY: no document parsing or AI processing occurs. Values, confidence,
// missing items, and page references are invented and never persisted to Supabase.
const foundFacts: { label: string; value: string; page: number; confidence: 'High' | 'Medium' | 'Low' }[] = [
  { label: 'Property Address', value: '123 Farm Road, Ames, IA 50010', page: 12, confidence: 'High' },
  { label: 'Total Acres', value: '842.6 acres', page: 12, confidence: 'High' },
  { label: 'Property Use', value: 'Agricultural / Farm', page: 14, confidence: 'High' },
  { label: 'Land Value', value: '$4,100,000', page: 68, confidence: 'High' },
  { label: 'Main Structure', value: 'Machine Shed', page: 42, confidence: 'High' },
  { label: 'Machine Shed Size', value: '18,500 SF', page: 42, confidence: 'High' },
  { label: 'Year Built', value: '1998', page: 42, confidence: 'High' },
  { label: 'Building / Construction Class', value: 'Steel Frame', page: 43, confidence: 'High' },
  { label: 'Condition', value: 'Average', page: 43, confidence: 'Medium' },
  { label: 'Remaining Economic Life', value: '22 years', page: 44, confidence: 'Medium' },
  { label: 'Grain Storage', value: '3 grain bins', page: 48, confidence: 'High' },
  { label: 'Irrigation', value: '2 center pivots', page: 52, confidence: 'High' },
  { label: 'Appraisal Effective Date', value: 'June 1, 2026', page: 4, confidence: 'High' },
  { label: 'Total Appraised Value', value: '$6,100,000', page: 68, confidence: 'High' },
];
const missingFacts: PreAnalysisResult['missingInformation'] = [
  { information: 'Grain Bin Capacity', appliesTo: 'Grain Bins', reason: 'Valuation' },
  { information: 'Grain Bin Age / Installation Year', appliesTo: 'Grain Bins', reason: 'Age / useful life' },
  { information: 'Foundation / Floor Details', appliesTo: 'Machine Shed', reason: 'Construction details for valuation' },
  { information: 'Irrigation Installation Year', appliesTo: 'Center Pivots', reason: 'Age / useful life' },
  { information: 'Renovation History', appliesTo: 'Machine Shed', reason: 'Condition / useful life' },
];

export function mockPreAnalysis(documents: RfsDocument[]): PreAnalysisResult | null {
  // Existing loader supplies stable document order. Analyze only the first stored appraisal.
  const appraisal = documents.find(document => document.document_category === 'property_appraisal' && document.storage_path);
  if (!appraisal) return null;
  const document = { id: appraisal.id, label: 'Property Appraisal', fileName: appraisal.file_name };
  return {
    document, status: 'review_complete', simulated: true,
    foundInformation: foundFacts.map(({ page, ...fact }) => ({ ...fact, source: { document, page } })),
    missingInformation: missingFacts.map(item => ({ ...item })),
  };
}
