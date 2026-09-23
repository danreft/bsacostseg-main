import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { loadRfsDetail } from '../../../../lib/proxima/load-rfs-detail';
import { additionalFields, detailContacts, documentLabels, mailingAddress, readable, type DetailContact } from '../../../../lib/proxima/rfs-detail';
import { formatPurchasePrice, formatSubmissionDate, mapRfsListRow, statusLabel } from '../../../../lib/proxima/rfs-list';
import { PreAnalysis } from '../../../../components/proxima/pre-analysis';
import { mockPreAnalysis } from '../../../../lib/proxima/mock-pre-analysis';
import { RfsReview } from '../../../../components/proxima/rfs-review';
import styles from '../../proxima.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'RFS Detail | Proxima', robots: { index: false, follow: false } };
function Fields({ values }: { values: [string, ReactNode][] }) {
  return <dl className={styles.details}>{values.filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
function Contact({ title, contact }: { title: string; contact?: DetailContact }) {
  return <div><h3>{title}</h3>{contact ? <Fields values={[
    ['Name', [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '—'], ['Title / Role', contact.title_role || '—'],
    ['Email', contact.email || '—'], ['Primary Phone', contact.primary_phone || '—'],
  ]} /> : <p className={styles.secondary}>Not provided.</p>}</div>;
}
export default async function RfsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let record;
  try { record = await loadRfsDetail(id); }
  catch { return <div className={styles.message} role="alert">Request could not be loaded. <a href={`/proxima/rfs/${encodeURIComponent(id)}`}>Try again</a> or <a href="/proxima/rfs">return to Client RFS</a>.</div>; }
  if (!record) notFound();
  const row = mapRfsListRow(record), contacts = detailContacts(record);
  const property = record.rfs_properties, acquisition = record.rfs_acquisitions;
  const acquired = acquisition?.acquisition_status === 'acquired';
  const info = additionalFields(record.rfs_additional_information);
  return <>
    <a className={styles.rfsLink} href="/proxima/rfs">← Client RFS</a>
    <header className={styles.detailHeader}><h1>{row.displayId} — {row.entity}</h1><div><span className={styles.badge}>{statusLabel(record.status)}</span><span className={styles.secondary}>Submitted {formatSubmissionDate(record.submitted_at)}</span></div></header>
    <section className={styles.panel} aria-labelledby="entity-title"><h2 id="entity-title">Entity &amp; Contact</h2><div className={styles.detailGrid}>
      <div><h3>Entity</h3><Fields values={[[ 'Legal Owner / Entity Name', row.entity ], ['Mailing Address', mailingAddress(contacts.entity)]]} /></div>
      <Contact title="Primary Contact" contact={contacts.primary} />
      {record.submission_type === 'representative' && <Contact title="Authorized Representative" contact={contacts.representative} />}
      {contacts.additional.map(contact => <Contact key={contact.id} title="Additional Contact" contact={contact} />)}
    </div></section>
    <section className={styles.panel} aria-labelledby="property-title"><h2 id="property-title">Property &amp; Acquisition</h2><div className={styles.detailGrid}>
      <div><h3>Property</h3>{property ? <Fields values={[
        ['Property / Farm Name', property.property_name], ['Property Address', property.address_line_1], ['City', property.city], ['State', property.state], ['County', property.county], ['ZIP Code', property.zip_code],
        ['Approximate Total Acres', new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(Number(property.approximate_total_acres))],
      ]} /> : <p>Not provided.</p>}</div>
      <div><h3>Acquisition</h3>{acquisition ? <Fields values={[
        ['Acquisition Status', acquired ? 'Acquired' : 'In Progress'],
        [acquired ? 'Acquisition Date' : 'Expected Closing Date', formatSubmissionDate(acquisition.acquisition_or_expected_closing_date)],
        [acquired ? 'Total Purchase Price' : 'Expected Purchase Price', formatPurchasePrice(row.purchasePrice)],
        ['Existing Purchase Price Allocation', acquisition.existing_purchase_price_allocation === 'not_sure' ? 'Not Sure' : readable(acquisition.existing_purchase_price_allocation)],
      ]} /> : <p>Not provided.</p>}</div>
    </div></section>
    <section className={styles.panel} aria-labelledby="documents-title"><h2 id="documents-title">Supporting Documents</h2>
      {record.rfs_documents.length ? <div className={styles.documentList}>{record.rfs_documents.map(document => <div key={document.id} className={styles.documentRow}>
        <div><h3>{documentLabels[document.document_category] ?? readable(document.document_category)}</h3><p>{document.file_name}</p></div>
        <div><span className={styles.secondary}>Processing status </span><span className={styles.badge}>{statusLabel(document.processing_status)}</span></div>
        {document.storage_path ? <a className={styles.rfsLink} href={`/proxima/rfs/${record.id}/documents/${document.id}`} target="_blank" rel="noopener noreferrer" aria-label={`View Document: ${document.file_name} (opens in new tab)`}>View Document ↗</a> : <span className={styles.secondary}>File unavailable</span>}
      </div>)}</div> : <p className={styles.secondary}>No supporting documents provided.</p>}
    </section>
    <section className={styles.panel} aria-labelledby="information-title"><h2 id="information-title">Additional Information</h2>{info.some(([, value]) => value) ? <Fields values={info} /> : <p className={styles.secondary}>No additional information provided.</p>}</section>
    <PreAnalysis submissionId={record.id} result={mockPreAnalysis(record.rfs_documents)} />
    <RfsReview key={record.id} status={record.status} />
  </>;
}
