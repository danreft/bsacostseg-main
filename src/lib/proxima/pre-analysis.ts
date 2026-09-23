export type AnalysisDocument = { id: string; label: string; fileName: string };
export type PreAnalysisResult = {
  document: AnalysisDocument;
  status: 'review_complete';
  simulated: boolean;
  foundInformation: {
    label: string;
    value: string;
    source: { document: AnalysisDocument; page: number };
    confidence: 'High' | 'Medium' | 'Low';
  }[];
  missingInformation: { information: string; appliesTo: string; reason: string }[];
};
