import type { Metadata } from "next";
import { loadRfsList } from "../../../lib/proxima/load-rfs";
import { RfsTable } from "../../../components/proxima/rfs-table";
import styles from "../proxima.module.css";

export const metadata: Metadata = { title: "Client RFS | Proxima", description: "Internal requests for service." };
export const dynamic = "force-dynamic";

export default async function ClientRfsPage() {
  let rows;
  try { rows = await loadRfsList(); }
  catch {
    // Never log credentials, contact data, or raw database responses.
    console.error("Unable to load the internal RFS list.");
    return <><h1 className={styles.title}>Requests for Service</h1>
      <div className={styles.message} role="alert">Requests could not be loaded. <a href="/proxima/rfs">Try again</a>.</div></>;
  }
  return <><h1 className={styles.title}>Requests for Service</h1><RfsTable rows={rows} /></>;
}
