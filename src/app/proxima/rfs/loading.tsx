import styles from "../proxima.module.css";

export default function Loading() {
  return <><h1 className={styles.title}>Requests for Service</h1><div className={styles.message} role="status">Loading requests…</div></>;
}
