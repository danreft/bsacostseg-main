import type { PreAnalysisResult } from '../../lib/proxima/pre-analysis';
import { documentSourceHref } from '../../lib/proxima/document-source';
import styles from '../../app/proxima/proxima.module.css';

export function PreAnalysis({ submissionId, result }: { submissionId: string; result: PreAnalysisResult | null }) {
  return <section className={styles.panel} aria-labelledby="analysis-title">
    <h2 id="analysis-title">Pre-Analysis</h2>
    <div className={styles.placeholder}>
      <h3>{result?.document.label ?? 'Property Appraisal'}</h3>
      <span className={styles.badge}>{result?.status === 'review_complete' ? 'Review Complete' : 'Not Provided'}</span>
    </div>
    {result && <>
      {result.simulated && <p className={styles.secondary}>Simulated POC results — values, confidence, missing items, and page references are examples, not extracted from the uploaded appraisal.</p>}
      <p className={styles.analysisSummary}><span>Information Found: {result.foundInformation.length}</span><span>Information Still Needed: {result.missingInformation.length}</span></p>
      <h3 id="found-title">Information Found</h3>
      <div className={styles.tableContainer}><div className={styles.tableScroll} role="region" aria-labelledby="found-title" tabIndex={0}>
        <table className={`${styles.table} ${styles.analysisTable}`}>
          <caption className="sr-only">Information Found</caption>
          <thead><tr>{['Information', 'Value', 'Source', 'Confidence'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{result.foundInformation.map(item => <tr key={item.label}>
            <td>{item.label}</td><td>{item.value}</td>
            <td><a className={styles.rfsLink} href={documentSourceHref(submissionId, item.source.document, item.source.page)} target="_blank" rel="noopener noreferrer" title={`${item.source.document.fileName} — opens in a new tab; page navigation depends on the document viewer`}>
              {item.source.document.label} · p. {item.source.page}
            </a></td>
            <td><span className={`${styles.badge} ${styles.confidence}`} data-confidence={item.confidence}>{item.confidence}</span></td>
          </tr>)}</tbody>
        </table>
      </div></div>
      <div className={styles.analysisSubheading}><h3 id="needed-title">Information Still Needed</h3><p className={styles.secondary}>Information that may still be needed to complete the Cost Seg / Valuation analysis.</p></div>
      <div className={styles.tableContainer}><div className={styles.tableScroll} role="region" aria-labelledby="needed-title" tabIndex={0}>
        <table className={`${styles.table} ${styles.analysisTable}`}>
          <caption className="sr-only">Information Still Needed</caption>
          <thead><tr>{['Information', 'Applies To', "Why It's Needed"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{result.missingInformation.map(item => <tr key={item.information}><td>{item.information}</td><td>{item.appliesTo}</td><td>{item.reason}</td></tr>)}</tbody>
        </table>
      </div></div>
    </>}
  </section>;
}
