import styles from '../../proxima.module.css';
export default function RequestNotFound() {
  return <div className={styles.message}><h1 className={styles.title}>Request not found.</h1><a href="/proxima/rfs">Return to Client RFS</a></div>;
}
