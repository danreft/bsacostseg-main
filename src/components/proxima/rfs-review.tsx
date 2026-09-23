'use client';
import { useRef, useState } from 'react';
import { statusLabel } from '../../lib/proxima/rfs-list';
import styles from '../../app/proxima/proxima.module.css';

export function RfsReview({ status }: { status: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [decision, setDecision] = useState<'Approved' | 'Rejected' | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [savedReason, setSavedReason] = useState('');
  function finish(value: 'Approved' | 'Rejected') {
    setDecision(value); setSavedReason(value === 'Rejected' ? reason.trim() : ''); dialog.current?.close();
  }
  return <section className={styles.panel} aria-labelledby="review-title">
    <div className={styles.sectionHeading}><h2 id="review-title">RFS Review</h2><button className={styles.primaryButton} onClick={() => { setRejecting(false); setReason(''); dialog.current?.showModal(); }}>Review RFS</button></div>
    <p className={styles.secondary}>Review decisions are temporary for this POC and reset when you leave or reload this page.</p>
    {decision && <div role="status"><span className={styles.badge}>{decision} · Local preview</span>{savedReason && <p className={styles.longText}>Rejection reason: {savedReason}</p>}
      {decision === 'Approved' && <p><button className={styles.button} disabled>Create Project</button> <span className={styles.secondary}>Available in a future workflow.</span></p>}
    </div>}
    <dialog ref={dialog} className={styles.reviewDialog} aria-labelledby="review-dialog-title">
      <h2 id="review-dialog-title">Review RFS</h2><p>Status: <span className={styles.badge}>{statusLabel(status)}</span></p>
      <p className={styles.secondary}>This review is a local preview. The submitted request will not be updated.</p>
      <form onSubmit={event => { event.preventDefault(); if (reason.trim()) finish('Rejected'); }}>
        {rejecting && <label className={styles.reason}>Rejection reason<textarea autoFocus required value={reason} onChange={event => setReason(event.target.value)} rows={4} /></label>}
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => dialog.current?.close()}>Cancel</button>
          {rejecting ? <button className={styles.rejectButton} disabled={!reason.trim()} type="submit">Confirm Rejection</button> : <>
            <button className={styles.rejectButton} type="button" onClick={() => setRejecting(true)}>Reject</button>
            <button className={styles.primaryButton} type="button" onClick={() => finish('Approved')}>Approve</button>
          </>}
        </div>
      </form>
    </dialog>
  </section>;
}
