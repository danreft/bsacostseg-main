// Temporary POC lists. Replace with the existing Proxima-managed self-service
// lists when available; no integration or configuration system is implemented here.
export const referralOptions = [
  { id: "online-search", label: "Online Search" },
  { id: "referral-partner", label: "Referral Partner", isReferralPartner: true },
  { id: "other", label: "Other" },
];

export const taxFilingTimingOptions = [
  { id: "within-30-days", label: "Within 30 days" },
  { id: "within-90-days", label: "In 31–90 days" },
  { id: "later", label: "More than 90 days from now" },
  { id: "not-sure", label: "Not Sure" },
];
