"use server";

import { mapSubmission, SubmissionValidationError } from "../../lib/rfs/submission";

export async function submitRfs(input: unknown): Promise<{ success: true; submissionId: string } | { success: false; error: string }> {
  try {
    const payload = mapSubmission(input);
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
    return { success: true, submissionId };
  } catch (error) {
    if (error instanceof SubmissionValidationError) return { success: false, error: error.message };
    // Do not log payloads, credentials, or return raw database errors.
    console.error("RFS submission failed.");
    return { success: false, error: "We couldn't confirm your submission. Your information has been kept. Please try again." };
  }
}
