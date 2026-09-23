import type { ReactNode } from "react";
import styles from "./proxima.module.css";

export default function ProximaLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>
    <a href="#proxima-content" className="skip-link">Skip to content</a>
    <header className={styles.header}>
      <div className={styles.brand}>Boa Safra <span>Proxima</span></div>
      <div className={styles.profile}><span className={styles.avatar} aria-hidden="true">OP</span> Operations</div>
    </header>
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <nav aria-label="Proxima">
          <a href="/proxima/rfs" aria-current="page" className={styles.activeNav}>Client RFS</a>
          {["Contracts", "Projects", "Entities", "Clients"].map(item => <span key={item} className={styles.inactiveNav} aria-disabled="true" title="Not available in this POC">{item}</span>)}
        </nav>
      </aside>
      <main id="proxima-content" className={styles.main}>{children}</main>
    </div>
  </div>;
}
