"use client";

import { useState } from "react";

export function RequestIntro() {
  const [started, setStarted] = useState(false);

  return (
    <>
      <p className="eyebrow">Request for service</p>
      <h1 id="request-heading">Request a Property Analysis</h1>
      <p className="intro-copy">
        Tell us about your property acquisition. We&apos;ll use this information to
        understand the property and determine the next steps for your analysis.
      </p>
      <div className="request-actions">
        <p id="time-expectation" className="time-expectation">Takes about 5–10 minutes.</p>
        <button
          type="button"
          className="primary-button"
          aria-describedby="time-expectation"
          onClick={() => setStarted(true)}
        >
          Get Started <span aria-hidden="true">→</span>
        </button>
        <p role="status" className="availability-message">
          {started ? "The request form is coming soon. You can’t submit a request just yet." : ""}
        </p>
      </div>
    </>
  );
}
