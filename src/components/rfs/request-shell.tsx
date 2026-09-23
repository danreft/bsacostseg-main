import type { ReactNode } from "react";
import { RequestProgress, type RequestProgressProps } from "./request-progress";

type RequestShellProps = RequestProgressProps & {
  children: ReactNode;
  headingId: string;
};

export function RequestShell({ children, headingId, ...progress }: RequestShellProps) {
  return (
    <div className="request-shell">
      <a className="skip-link" href="#request-content">Skip to content</a>
      <header className="site-header">
        <span className="brand-mark" aria-hidden="true">PA</span>
        <span>Property Analysis</span>
      </header>
      <main id="request-content" tabIndex={-1} className="request-container">
        <h1 className="page-title">Request for Services</h1>
        <RequestProgress {...progress} />
        <section className="request-card" aria-labelledby={headingId}>
          {children}
        </section>
      </main>
    </div>
  );
}
