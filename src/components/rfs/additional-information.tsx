import { referralOptions, taxFilingTimingOptions } from "./additional-information-options";

export type AdditionalInformationValue = {
  referralSource: string;
  noReferralCode: boolean;
  referralCode: string;
  referralPartnerName: string;
  cpaCompany: string;
  taxFilingTiming: string;
  additionalDetails: string;
  communicationPreference: "" | "text" | "email" | "both" | "no";
};

export const emptyAdditionalInformation: AdditionalInformationValue = {
  referralSource: "", noReferralCode: false, referralCode: "", referralPartnerName: "",
  cpaCompany: "", taxFilingTiming: "", additionalDetails: "", communicationPreference: "",
};

export function AdditionalInformation({ value, onChange, onPrevious, onNext }: {
  value: AdditionalInformationValue;
  onChange: (value: AdditionalInformationValue) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  function update(patch: Partial<AdditionalInformationValue>) { onChange({ ...value, ...patch }); }
  const isReferralPartner = referralOptions.some((option) => option.id === value.referralSource && option.isReferralPartner);

  return <form onSubmit={(event) => { event.preventDefault(); onNext(); }}>
    <p className="supporting-copy">Fields marked * are required.</p>
    <div className="field-grid">
      <div className="form-field field-wide">
        <label htmlFor="referral-source">How did you hear about us? *</label>
        <select id="referral-source" name="referral-source" required value={value.referralSource}
          onChange={(event) => update({ referralSource: event.target.value, noReferralCode: false, referralCode: "", referralPartnerName: "" })}>
          <option value="">Select an option</option>
          {referralOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </div>

      {isReferralPartner && <div className="field-wide field-grid">
        <label className="choice-card field-wide">
          <input type="checkbox" name="no-referral-code" checked={value.noReferralCode}
            aria-controls="referral-information"
            onChange={(event) => update({ noReferralCode: event.target.checked, referralCode: "", referralPartnerName: "" })} />
          I don&apos;t have a referral code
        </label>
        <div id="referral-information" className="form-field field-wide" key={value.noReferralCode ? "partner-name" : "code"}>
          {value.noReferralCode ? <>
            <label htmlFor="referral-partner-name">Referral Partner Name *</label>
            <input id="referral-partner-name" name="referral-partner-name" type="text" required pattern=".*\S.*"
              value={value.referralPartnerName} onChange={(event) => update({ referralPartnerName: event.target.value })} />
          </> : <>
            <label htmlFor="referral-code">Referral Code</label>
            <input id="referral-code" name="referral-code" type="text"
              value={value.referralCode} onChange={(event) => update({ referralCode: event.target.value })} />
          </>}
        </div>
      </div>}

      <div className="form-field">
        <label htmlFor="cpa-company">CPA / Tax Filing Company</label>
        <input id="cpa-company" name="cpa-company" type="text" maxLength={100}
          value={value.cpaCompany} onChange={(event) => update({ cpaCompany: event.target.value.slice(0, 100) })} />
      </div>

      <div className="form-field">
        <label htmlFor="tax-filing-timing">When do you plan to file your taxes? *</label>
        <select id="tax-filing-timing" name="tax-filing-timing" required value={value.taxFilingTiming}
          onChange={(event) => update({ taxFilingTiming: event.target.value })}>
          <option value="">Select an option</option>
          {taxFilingTimingOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </div>

      <div className="form-field field-wide">
        <label htmlFor="additional-details">Additional Details</label>
        <textarea id="additional-details" name="additional-details" rows={3}
          value={value.additionalDetails} onChange={(event) => update({ additionalDetails: event.target.value })} />
      </div>
    </div>

    <fieldset className="choice-group">
      <legend>Preferred Method of Communication *</legend>
      <div className="choice-options">
        {([{ id: "text", label: "Text" }, { id: "email", label: "Email" }, { id: "both", label: "Both" }, { id: "no", label: "No" }] as const).map((option) =>
          <label key={option.id} className="choice-card"><input type="radio" required name="communication-preference" value={option.id}
            checked={value.communicationPreference === option.id}
            onChange={() => update({ communicationPreference: option.id })} />{option.label}</label>)}
      </div>
    </fieldset>

    <div className="form-navigation">
      <button type="button" className="secondary-button" onClick={onPrevious}>Previous</button>
      <div><button type="button" className="text-button" disabled aria-describedby="additional-save-note">Save for Later</button><span id="additional-save-note" className="save-note">Coming soon</span></div>
      <button type="submit" className="primary-button">Review Request</button>
    </div>
  </form>;
}
