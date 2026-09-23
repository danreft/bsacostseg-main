"use server";

import { mapSubmission, SubmissionValidationError } from "../../lib/rfs/submission";
import { randomUUID } from "node:crypto";
import { documentExtension, documentMimeType, validateDocuments } from "../../lib/rfs/documents";

export async function submitRfs(input: unknown, files: FormData = new FormData()): Promise<
  { success: true; submissionId: string; documentsFailed: number } | { success: false; error: string }
> {
  try {
    const payload = mapSubmission(input);
    let documents: ReturnType<typeof validateDocuments>;
    try { documents = validateDocuments(files); }
    catch (error) { throw new SubmissionValidationError((error as Error).message); }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secret) {
      console.error("RFS submission requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
      return { success: false, error: "Submission is not configured yet. Your information has been kept; please try again later." };
    }
    // All privileged access stays in this server module. No browser Supabase client needed.
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/submit_rfs`, {
      method: "POST", cache: "no-store",
      headers: { apikey: secret, "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    if (!response.ok) throw new Error("RFS database request failed");
    const submissionId: unknown = await response.json();
    if (typeof submissionId !== "string" || !/^[0-9a-f-]{36}$/i.test(submissionId)) throw new Error("Invalid RFS response");
    let documentsFailed = 0;
    for (const { category, file } of documents) {
      const storagePath = `${submissionId}/${category}/${randomUUID()}.${documentExtension(file)}`;
      let stage = "upload";
      let status: number | undefined;
      try {
        const upload = await fetch(`${url.replace(/\/$/, "")}/storage/v1/object/rfs-documents/${storagePath}`, {
          method: "POST", cache: "no-store", signal: AbortSignal.timeout(30_000),
          headers: { apikey: secret, "Content-Type": documentMimeType(file), "x-upsert": "false" },
          body: file,
        });
        status = upload.status;
        if (!upload.ok) throw new Error("Upload failed");
        stage = "metadata";
        status = undefined;
        const metadata = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rfs_documents`, {
          method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
          headers: { apikey: secret, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ rfs_submission_id: submissionId, document_category: category,
            file_name: file.name, storage_path: storagePath, mime_type: documentMimeType(file),
            file_size: file.size, processing_status: "pending" }),
        });
        status = metadata.status;
        if (!metadata.ok) throw new Error("Metadata insert failed");
      } catch (error) {
        documentsFailed++;
        // Keep the RFS and any uploaded object, including on an ambiguous metadata timeout.
        // These identifiers allow manual investigation without logging credentials or file content.
        console.error("RFS document persistence failed.", {
          submissionId, category, storagePath, stage, status,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
    return { success: true, submissionId, documentsFailed };
  } catch (error) {
    if (error instanceof SubmissionValidationError) return { success: false, error: error.message };
    // Do not log payloads, credentials, or return raw database errors.
    console.error("RFS submission failed.");
    return { success: false, error: "We couldn't confirm your submission. Your information has been kept. Please try again." };
  }
}
