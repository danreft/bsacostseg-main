"use client";

import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";
import { AdditionalInformation, emptyAdditionalInformation, type AdditionalInformationValue } from "./additional-information";
import { ContactFields, OwnerFields, emptyClient, emptyContact, type ClientInformation } from "./contact-fields";
import { mockClient } from "./mock-client";
import { RequestReview } from "./request-review";
import { RequestShell } from "./request-shell";
import { ServiceDetails, emptyServiceDetails, type ServiceDetailsValue, type SupportingDocuments } from "./service-details";

import { submitRfs } from "../../app/actions/submit-rfs";

const steps = [
  { id: "contact", label: "Authorized Representative" },
  { id: "service", label: "Service Details" },
  { id: "additional", label: "Additional Information" },
  { id: "review", label: "Review" },
];

export function RequestForm() {
  const [step, setStep] = useState(1);
  const [additionalInformation, setAdditionalInformation] = useState<AdditionalInformationValue>({ ...emptyAdditionalInformation });
  const [serviceDetails, setServiceDetails] = useState<ServiceDetailsValue>({ ...emptyServiceDetails });
  const [documents, setDocuments] = useState<SupportingDocuments>({});
  const [path, setPath] = useState<"existing" | "new" | null>(null);
  const [submittingFor, setSubmittingFor] = useState<"self" | "other" | null>(null);
  const [newClient, setNewClient] = useState<ClientInformation>({ ...emptyClient });
  const [existingClient, setExistingClient] = useState<ClientInformation | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [newHasAdditional, setNewHasAdditional] = useState(false);
  const [existingHasAdditional, setExistingHasAdditional] = useState(false);
  const [newAdditional, setNewAdditional] = useState({ ...emptyContact });
  const [existingAdditional, setExistingAdditional] = useState({ ...emptyContact });
  const hasAdditional = path === "existing" ? existingHasAdditional : newHasAdditional;
  const setHasAdditional = path === "existing" ? setExistingHasAdditional : setNewHasAdditional;
  const additional = path === "existing" ? existingAdditional : newAdditional;
  const setAdditional = path === "existing" ? setExistingAdditional : setNewAdditional;
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submissionLock = useRef(false);
  const [error, setError] = useState("");
  const formStepsRef = useRef<HTMLDivElement>(null);
  const invalidFormRef = useRef<HTMLFormElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (previousStep.current !== step) headingRef.current?.focus();
    previousStep.current = step;
    if (invalidFormRef.current) {
      invalidFormRef.current.reportValidity();
      invalidFormRef.current = null;
    }
  }, [step]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  function selectPath(value: "existing" | "new") {
    setPath(value);
    setError("");
  }

  function contactValidationError() {
    if (!path) return "Please select whether you are an existing or new client.";
    if (path === "new" && !submittingFor) return "Please select who you are submitting this request for.";
    if (path === "existing" && (!existingClient || !confirmed || editing)) {
      return "Please confirm your information before continuing.";
    }
    return "";
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = contactValidationError();
    if (message) return setError(message);
    setError("");
    setStep(2);
  }

  function submitRequest() {
    if (submissionLock.current || submitted) return;
    const message = contactValidationError();
    if (message) {
      setError(message);
      setStep(1);
      return;
    }
    // Reuse the original forms' native constraints, including conditional fields.
    for (const previous of [1, 2, 3]) {
      const form = formStepsRef.current?.querySelector<HTMLFormElement>(`[data-rfs-step="${previous}"] form`);
      if (!form) return;
      if (!form.checkValidity()) {
        invalidFormRef.current = form;
        setStep(previous);
        return;
      }
    }
    if (!path) return;
    submissionLock.current = true;
    setSubmitting(true);
    setError("");
    startTransition(async () => {
      try {
        const result = await submitRfs({ path, submittingFor, client,
          additional: additionalRequired || hasAdditional ? additional : null,
          service: serviceDetails, information: additionalInformation });
        if (result.success) setSubmitted(true);
        else setError(result.error);
      } catch {
        setError("We couldn't confirm your submission. Your information has been kept. Please try again.");
      } finally {
        submissionLock.current = false;
        setSubmitting(false);
      }
    });
  }

  const showFields = path === "new" && submittingFor !== null || path === "existing" && editing;
  const showAdditional = path === "new" && submittingFor !== null || path === "existing" && existingClient !== null;
  const additionalRequired = path === "new" && submittingFor === "other";
  const client = path === "existing" ? existingClient ?? emptyClient : newClient;
  function updateClient(value: Partial<ClientInformation>) {
    if (path === "existing") {
      setExistingClient({ ...client, ...value });
      setConfirmed(false);
    } else setNewClient({ ...client, ...value });
  }

  return <RequestShell steps={steps} currentStepId={steps[step - 1].id} headingId="request-heading">
    <div className="step-heading">
      <h2 id="request-heading" ref={headingRef} tabIndex={-1}>{steps[step - 1].label}</h2>
      <p className="step-count">Step {step} of 4</p>
    </div>
    {error && <p className="form-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
    {submitted && <div role="status">
      <p>Your request was submitted successfully.</p>
      <p className="supporting-copy">Selected documents have not been uploaded or saved.</p>
    </div>}
    <div ref={formStepsRef} hidden={submitted}>
    <div data-rfs-step="2" hidden={step !== 2}><ServiceDetails value={serviceDetails} onChange={setServiceDetails}
      documents={documents} onDocumentsChange={setDocuments}
      onPrevious={() => setStep(1)} onNext={() => setStep(3)}
    /></div>
    <div data-rfs-step="3" hidden={step !== 3}><AdditionalInformation value={additionalInformation} onChange={setAdditionalInformation}
      onPrevious={() => setStep(2)} onNext={() => setStep(4)}
    /></div>
    {step === 4 && <RequestReview client={client}
      additional={additionalRequired || hasAdditional ? additional : null}
      service={serviceDetails} documents={documents} information={additionalInformation}
      onEdit={(nextStep) => { if (!submissionLock.current) { setError(""); setStep(nextStep); } }} onSubmit={submitRequest} submitting={submitting}
    />}
    <div data-rfs-step="1" hidden={step !== 1}><form onSubmit={submit}>
      <p className="supporting-copy">Let’s start with who to contact about this request.</p>
      <fieldset className="choice-group">
        <legend>Are you already a Boa Safra client?</legend>
        <div className="choice-options">
          <label className="choice-card"><input type="radio" name="client-path" checked={path === "existing"} onChange={() => selectPath("existing")} />Yes, I&apos;m an existing client</label>
          <label className="choice-card"><input type="radio" name="client-path" checked={path === "new"} onChange={() => selectPath("new")} />No, I&apos;m new to Boa Safra</label>
        </div>
      </fieldset>

      {path === "existing" && !existingClient && <div className="information-panel">
        <p>Existing clients will be able to sign in to confirm their information without entering it again.</p>
        <p className="supporting-copy">For this preview, you’ll see sample client information.</p>
        <button type="button" className="primary-button" onClick={() => { setExistingClient({ ...mockClient }); setError(""); }}>Continue as Existing Client</button>
      </div>}

      {path === "existing" && existingClient && !editing && <section className="form-section" aria-labelledby="your-information">
        <div className="section-heading"><h2 id="your-information">Your Information</h2><span className="sample-badge">Sample client</span></div>
        <dl className="contact-summary">
          <div><dt>Name</dt><dd>{existingClient.firstName} {existingClient.lastName}</dd></div>
          <div><dt>Company / Legal Entity</dt><dd>{existingClient.entity}</dd></div>
          <div><dt>Email</dt><dd>{existingClient.email}</dd></div>
          <div><dt>Phone</dt><dd>{existingClient.primaryPhone}</dd></div>
          <div><dt>Mailing Address</dt><dd>{existingClient.address}{existingClient.addressLine2 && <><br />{existingClient.addressLine2}</>}<br />{existingClient.city}, {existingClient.state} {existingClient.zip}</dd></div>
        </dl>
        <div className="confirmation-actions">
          <button type="button" className="primary-button" onClick={() => { setConfirmed(true); setError(""); }}>Information Looks Correct</button>
          <button type="button" className="secondary-button" onClick={() => { setEditing(true); setConfirmed(false); setError(""); }}>Update Information</button>
        </div>
        {confirmed && <p className="confirmation-message" role="status">✓ Information confirmed. You can continue.</p>}
      </section>}

      {path === "new" && <fieldset className="choice-group followup-choice">
        <legend>I am submitting this request:</legend>
        <div className="choice-options">
          <label className="choice-card"><input type="radio" name="submitting-for" checked={submittingFor === "self"} onChange={() => { setSubmittingFor("self"); setError(""); }} />For myself</label>
          <label className="choice-card"><input type="radio" name="submitting-for" checked={submittingFor === "other"} onChange={() => { setSubmittingFor("other"); setError(""); }} />On behalf of someone else</label>
        </div>
      </fieldset>}

      {showFields && <>
        <section className="form-section" aria-labelledby="contact-fields-heading">
          <h2 id="contact-fields-heading">Authorized Representative Information</h2>
          <p className="supporting-copy">Fields marked * are required.</p>
          {path === "existing" && <p className="supporting-copy">Changes apply to this preview only.</p>}
          <ContactFields prefix={`${path}-primary`} value={client} onChange={updateClient} />
        </section>
        <section className="form-section" aria-labelledby="owner-fields-heading">
          <h2 id="owner-fields-heading">Legal Owner / Entity Information</h2>
          <OwnerFields prefix={`${path}-owner`} value={client} onChange={updateClient} />
        </section>
        {path === "existing" && <button type="button" className="secondary-button" onClick={(event) => {
          if (event.currentTarget.form?.reportValidity()) { setEditing(false); setConfirmed(false); setError(""); }
        }}>Review Updated Information</button>}
      </>}

      {showAdditional && <section className="form-section" aria-labelledby="additional-contact-heading">
        <div className="section-heading"><h2 id="additional-contact-heading">Additional Contact</h2><span className="supporting-copy">{additionalRequired ? "Required" : "Optional"}</span></div>
        {additionalRequired && <p className="supporting-copy">Please provide an additional contact for the client who can receive communications regarding this request.</p>}
        {additionalRequired || hasAdditional ? <>
          <ContactFields key={`${path}-${additionalRequired}`} prefix="additional" optional={!additionalRequired} value={additional} onChange={setAdditional} />
          {!additionalRequired && <button type="button" className="text-button" onClick={() => { setHasAdditional(false); setAdditional({ ...emptyContact }); }}>Remove Additional Contact</button>}
        </> : <button type="button" className="text-button" onClick={() => setHasAdditional(true)}>+ Add Additional Contact</button>}
      </section>}

      <div className="form-navigation">
        <div><button type="button" className="text-button" disabled aria-describedby="save-note">Save for Later</button><span id="save-note" className="save-note">Coming soon</span></div>
        <button type="submit" className="primary-button">Next <span aria-hidden="true">→</span></button>
      </div>
    </form></div>
    </div>
  </RequestShell>;
}
