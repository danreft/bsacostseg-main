import { DOCUMENT_ACCEPT, MAX_DOCUMENT_BYTES } from "../../lib/rfs/documents";

export type ServiceDetailsValue = {
  propertyName: string;
  address: string;
  city: string;
  state: string;
  county: string;
  zip: string;
  acres: string;
  acquired: "yes" | "no" | "";
  acquisitionDate: string;
  purchasePrice: string;
  existingAllocation: "yes" | "no" | "not-sure" | "";
};

export const emptyServiceDetails: ServiceDetailsValue = {
  propertyName: "", address: "", city: "", state: "", county: "", zip: "", acres: "",
  acquired: "", acquisitionDate: "", purchasePrice: "", existingAllocation: "",
};

export const documentCategories = [
  { id: "purchase-agreement", label: "Purchase Agreement" },
  { id: "property-appraisal", label: "Property Appraisal" },
  { id: "existing-allocation", label: "Existing Purchase Price Allocation" },
  { id: "asset-equipment-list", label: "Fixed Asset / Equipment List" },
  { id: "other", label: "Other Supporting Documents" },
] as const;

// Files remain in memory until final submission sends them to the server action.
export type SupportingDocuments = Partial<Record<typeof documentCategories[number]["id"], File>>;

const propertyFields = [
  { key: "propertyName", label: "Property / Farm Name", optional: true, wide: true },
  { key: "address", label: "Property Address", autoComplete: "address-line1", wide: true },
  { key: "city", label: "City", autoComplete: "address-level2" },
  { key: "state", label: "State", autoComplete: "address-level1" },
  { key: "county", label: "County" },
  { key: "zip", label: "ZIP Code", autoComplete: "postal-code" },
] as const;

export function ServiceDetails({ value, onChange, documents, onDocumentsChange, onPrevious, onNext }: {
  value: ServiceDetailsValue;
  onChange: (value: ServiceDetailsValue) => void;
  documents: SupportingDocuments;
  onDocumentsChange: (documents: SupportingDocuments) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  function update(patch: Partial<ServiceDetailsValue>) { onChange({ ...value, ...patch }); }
  const inProgress = value.acquired === "no";

  return <form onSubmit={(event) => { event.preventDefault(); onNext(); }}>
    <p className="supporting-copy">Tell us a little about the property and acquisition. Fields marked * are required.</p>

    <section className="form-section" aria-labelledby="property-information-heading">
      <h2 id="property-information-heading">Property Information</h2>
      <div className="field-grid">
        {propertyFields.map((field) => {
          const id = `property-${field.key}`;
          const optional = "optional" in field && field.optional;
          return <div key={id} className={`form-field${"wide" in field && field.wide ? " field-wide" : ""}`}>
            <label htmlFor={id}>{field.label}{optional ? " (optional)" : " *"}</label>
            <input id={id} name={id} type="text" required={!optional}
              autoComplete={"autoComplete" in field ? `section-property ${field.autoComplete}` : undefined}
              inputMode={field.key === "zip" ? "numeric" : undefined}
              pattern={field.key === "zip" ? "[0-9]{5}(-[0-9]{4})?" : optional ? undefined : ".*\\S.*"}
              title={field.key === "zip" ? "Enter a 5-digit ZIP Code or ZIP+4 (12345-6789)." : undefined}
              value={value[field.key]} onChange={(event) => update({ [field.key]: event.target.value })} />
          </div>;
        })}
        <div className="form-field field-wide">
          <label htmlFor="property-acres">Approximate Total Acres *</label>
          <input id="property-acres" name="property-acres" type="number" inputMode="decimal"
            required min="0.0001" max="100000000" step="any" aria-describedby="acres-note"
            value={value.acres} onChange={(event) => update({ acres: event.target.value })} />
          <p id="acres-note" className="supporting-copy">Your best estimate is fine.</p>
        </div>
      </div>
    </section>

    <section className="form-section" aria-labelledby="acquisition-information-heading">
      <h2 id="acquisition-information-heading">Acquisition Information</h2>
      <fieldset className="choice-group">
        <legend>Has this property already been acquired? *</legend>
        <div className="choice-options">
          {([{ id: "yes", label: "Yes" }, { id: "no", label: "No — acquisition is in progress" }] as const).map((option) =>
            <label key={option.id} className="choice-card"><input type="radio" name="acquired" value={option.id}
              required checked={value.acquired === option.id} onChange={() => update({ acquired: option.id })} />{option.label}</label>)}
        </div>
      </fieldset>

      {value.acquired && <div className="field-grid acquisition-fields" key={value.acquired}>
        <div className="form-field">
          <label htmlFor="acquisition-date">{inProgress ? "Expected Closing Date" : "Acquisition Date"} *</label>
          <input id="acquisition-date" name="acquisition-date" type="date" required
            min="1800-01-01" max="9999-12-31" value={value.acquisitionDate}
            onChange={(event) => update({ acquisitionDate: event.target.value })} />
        </div>
        <div className="form-field">
          <label htmlFor="purchase-price">{inProgress ? "Expected Purchase Price" : "Total Purchase Price"} *</label>
          <div className="currency-input"><span aria-hidden="true">$</span>
            <input id="purchase-price" name="purchase-price" type="text" inputMode="decimal" required
              pattern="(?=.*[1-9])([0-9]+|[0-9]{1,3}(,[0-9]{3})+)(\.[0-9]{1,2})?"
              title="Enter an amount greater than zero, with up to two decimal places (for example, 1,250,000.00)."
              aria-describedby="purchase-price-note" value={value.purchasePrice}
              onChange={(event) => update({ purchasePrice: event.target.value })} />
          </div>
          <p id="purchase-price-note" className="supporting-copy">In US dollars. For example, 1,250,000.00.</p>
        </div>
      </div>}

      <fieldset className="choice-group" aria-describedby="allocation-note">
        <legend>Was the purchase price already allocated among land, buildings, equipment, or other assets? *</legend>
        <p id="allocation-note" className="supporting-copy">For example, the purchase agreement or appraisal may assign values to different parts of the property.</p>
        <div className="choice-options">
          {([{ id: "yes", label: "Yes" }, { id: "no", label: "No" }, { id: "not-sure", label: "Not Sure" }] as const).map((option) =>
            <label key={option.id} className="choice-card"><input type="radio" name="existing-allocation" value={option.id}
              required checked={value.existingAllocation === option.id} onChange={() => update({ existingAllocation: option.id })} />{option.label}</label>)}
        </div>
        {value.existingAllocation === "yes" && <p className="supporting-copy">If available, include the allocation in Supporting Documents below.</p>}
      </fieldset>
    </section>

    <section className="form-section" aria-labelledby="supporting-documents-heading">
      <h2 id="supporting-documents-heading">Supporting Documents</h2>
      <p className="supporting-copy">Upload any documents you have related to the acquisition. Providing these documents can help us evaluate the property and reduce follow-up questions.</p>
      <p className="supporting-copy">Don&apos;t have all of these available? That&apos;s okay. Upload what you have and our team can request anything else that&apos;s needed.</p>
      <p id="documents-note" className="supporting-copy">All documents are optional. Files are saved when you submit your request. Maximum {MAX_DOCUMENT_BYTES / 1024 / 1024} MB per file.</p>
      <div className="document-list">
        {documentCategories.map((category) => {
          const file = documents[category.id];
          const id = `document-${category.id}`;
          return <div className="document-upload form-field" key={category.id}>
            <label htmlFor={id}>{category.label} (optional){file && <span className="sr-only"> — replace selected file</span>}</label>
            <div className="document-picker">
              <span aria-hidden="true">{file ? "Replace file" : "Choose file"}</span>
              <input id={id} name={id} type="file" accept={DOCUMENT_ACCEPT}
              aria-describedby={`documents-note ${id}-selected`}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) onDocumentsChange({ ...documents, [category.id]: selected });
                event.target.value = "";
              }} />
            </div>
            <p id={`${id}-selected`} className="document-filename" role="status">{file ? `Selected: ${file.name}` : "No file selected"}</p>
            {file && <button type="button" className="text-button" aria-label={`Remove ${category.label} file`}
              onClick={() => {
                const nextDocuments = { ...documents };
                delete nextDocuments[category.id];
                onDocumentsChange(nextDocuments);
              }}>Remove file</button>}
          </div>;
        })}
      </div>
    </section>

    <div className="form-navigation">
      <button type="button" className="secondary-button" onClick={onPrevious}>Previous</button>
      <div><button type="button" className="text-button" disabled aria-describedby="service-save-note">Save for Later</button><span id="service-save-note" className="save-note">Coming soon</span></div>
      <button type="submit" className="primary-button">Next <span aria-hidden="true">→</span></button>
    </div>
  </form>;
}
