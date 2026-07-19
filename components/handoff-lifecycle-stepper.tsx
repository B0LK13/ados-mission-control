import type { HandoffItem } from "@/lib/contracts";

const STAGES: HandoffItem["lifecycleStage"][] = [
  "REQUEST_PUBLISHED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESULT_RECEIVED",
  "VALIDATED",
  "ARCHIVED",
];

/** Read-only lifecycle stepper. Terminal/unavailable stages render as attention without inventing progress. */
export function HandoffLifecycleStepper({ stage }: { stage: HandoffItem["lifecycleStage"] }) {
  if (stage === "WORKER_UNAVAILABLE") {
    return (
      <ol className="lifecycle-stepper unavailable" aria-label="Handoff lifecycle">
        <li className="current"><span>WORKER UNAVAILABLE</span></li>
      </ol>
    );
  }
  const currentIndex = STAGES.indexOf(stage);
  return (
    <ol className="lifecycle-stepper" aria-label="Handoff lifecycle">
      {STAGES.map((item, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "pending";
        return (
          <li key={item} className={state}>
            <span>{item.replaceAll("_", " ")}</span>
          </li>
        );
      })}
    </ol>
  );
}
