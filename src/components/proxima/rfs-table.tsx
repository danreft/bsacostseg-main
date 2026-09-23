"use client";

import { useRef, useEffect, useState } from "react";
import { formatPurchasePrice, formatSubmissionDate, statusLabel, type RfsListRow } from "../../lib/proxima/rfs-list";
import styles from "../../app/proxima/proxima.module.css";

const columns = [
  ["displayId", "RFS ID"], ["submittedAt", "Submission Date"], ["entity", "Entity"],
  ["primaryContact", "Primary Contact"], ["property", "Property"],
  ["purchasePrice", "Purchase Price"], ["status", "Status"],
] as const;
type SortKey = typeof columns[number][0];

export function RfsTable({ rows }: { rows: RfsListRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("submitted");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "submittedAt", direction: "desc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectAll = useRef<HTMLInputElement>(null);
  const query = search.trim().toLocaleLowerCase();
  const visible = rows.filter(row => (status === "all" || row.status === status)
    && [row.entity, row.primaryContact, row.property].some(value => value.toLocaleLowerCase().includes(query)))
    .sort((a, b) => {
      const left = a[sort.key], right = b[sort.key];
      if (left === null) return right === null ? 0 : 1;
      if (right === null) return -1;
      const result = sort.key === "submittedAt" ? Date.parse(String(left)) - Date.parse(String(right))
        : typeof left === "number" && typeof right === "number" ? left - right
        : String(left).localeCompare(String(right), "en", { numeric: true, sensitivity: "base" });
      return result * (sort.direction === "asc" ? 1 : -1) || a.id.localeCompare(b.id);
    });
  const selectedVisible = visible.filter(row => selected.has(row.id)).length;
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
  }, [selectedVisible, visible.length]);

  return <>
    <div className={styles.filters}>
      {(search !== "" || status !== "all") && <button className={styles.clear} onClick={() => { setSearch(""); setStatus("all"); }}>Clear All Filters</button>}
      <label className={styles.search}>Search<input type="search" value={search} placeholder="Entity, contact, or property" onChange={event => setSearch(event.target.value)} /></label>
      <label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All</option><option value="submitted">Submitted</option></select></label>
    </div>
    <div className={styles.tableContainer}>
      <div className={styles.tableScroll} role="region" aria-label="Requests for service table" tabIndex={0}>
        <table className={styles.table}>
          <caption className="sr-only">Requests for Service</caption>
          <thead><tr>
            <th className={styles.selection}><input ref={selectAll} type="checkbox" aria-label="Select all visible requests" disabled={!visible.length} checked={visible.length > 0 && selectedVisible === visible.length} onChange={event => {
              const checked = event.target.checked;
              setSelected(previous => { const next = new Set(previous); visible.forEach(row => checked ? next.add(row.id) : next.delete(row.id)); return next; });
            }} /></th>
            {columns.map(([key, label]) => <th key={key} scope="col" className={key === "purchasePrice" ? styles.numeric : undefined} aria-sort={sort.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
              <button className={styles.sort} onClick={() => setSort(previous => ({ key, direction: previous.key === key && previous.direction === "asc" ? "desc" : "asc" }))}>{label}<span aria-hidden="true">{sort.key === key ? sort.direction === "asc" ? "↑" : "↓" : "↕"}</span></button>
            </th>)}
          </tr></thead>
          <tbody>{visible.map(row => <tr key={row.id} data-selected={selected.has(row.id)}>
            <td className={styles.selection}><input type="checkbox" aria-label={`Select ${row.displayId}`} checked={selected.has(row.id)} onChange={event => {
              const checked = event.target.checked;
              setSelected(previous => { const next = new Set(previous); if (checked) next.add(row.id); else next.delete(row.id); return next; });
            }} /></td>
            <td><a className={styles.rfsLink} href={`/proxima/rfs/${row.id}`}>{row.displayId}</a></td>
            <td className={styles.date}>{formatSubmissionDate(row.submittedAt)}</td>
            <td>{row.entity}</td><td>{row.primaryContact}</td><td>{row.property}</td>
            <td className={styles.numeric}>{formatPurchasePrice(row.purchasePrice)}</td>
            <td><span className={styles.badge}>{statusLabel(row.status)}</span></td>
          </tr>)}{!visible.length && <tr><td colSpan={8} className={styles.empty}>No requests found.</td></tr>}</tbody>
        </table>
      </div>
      <div className={styles.tableFooter} role="status">{visible.length} {visible.length === 1 ? "request" : "requests"}{selected.size > 0 && <span>{selected.size} selected</span>}</div>
    </div>
  </>;
}
