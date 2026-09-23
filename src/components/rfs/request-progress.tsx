export type RequestStep = {
  id: string;
  label: string;
};

export type RequestProgressProps = {
  steps: readonly RequestStep[];
  currentStepId: string;
};

export function RequestProgress({ steps, currentStepId }: RequestProgressProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <nav aria-label="Request progress" className="request-progress">
      <ol>
        {steps.map((step, index) => (
          <li
            key={step.id}
            aria-current={step.id === currentStepId ? "step" : undefined}
            data-complete={index < currentIndex}
          >
            <span className="step-marker" aria-hidden="true">
              {index < currentIndex ? "✓" : index + 1}
            </span>
            <span>{step.label}</span>
            {index < currentIndex && <span className="sr-only"> (completed)</span>}
          </li>
        ))}
      </ol>
      <div className="progress-status">
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }} />
        </div>
        <span className="step-count">Step {currentIndex + 1} of {steps.length}</span>
      </div>
    </nav>
  );
}
