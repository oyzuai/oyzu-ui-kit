import { useState, type ComponentProps, type ReactNode } from "react";
import { Check } from "lucide-react";
import { FlowDialog } from "./flow-dialog";

export type WizardStep = {
  label: string;
  title: string;
  description: string;
  content: ReactNode;
  validate?: () => boolean;
};
type WizardDialogProps = Omit<
  ComponentProps<typeof FlowDialog>,
  "title" | "description" | "children" | "onBack" | "onSubmit"
> & {
  steps: readonly [WizardStep, ...WizardStep[]];
  onComplete: (signal: AbortSignal) => Promise<void>;
};

/** Navigation belongs here; callers supply steps, validation and the final operation. */
export function WizardDialog({
  steps,
  onComplete,
  onOpenChange,
  submitLabel,
  ...props
}: WizardDialogProps) {
  const [index, setIndex] = useState(0);
  const current = Math.min(index, steps.length - 1);
  const step = steps[current];
  return (
    <FlowDialog
      {...props}
      title={step.title}
      description={step.description}
      onOpenChange={(open) => {
        if (open) setIndex(0);
        onOpenChange(open);
      }}
      submitLabel={current === steps.length - 1 ? submitLabel : "Continue"}
      onBack={current > 0 ? () => setIndex(current - 1) : undefined}
      onSubmit={async (signal) => {
        if (step.validate && !step.validate()) return;
        if (current < steps.length - 1) setIndex(current + 1);
        else await onComplete(signal);
      }}
    >
      <ol className="stepper" aria-label="Setup progress">
        {steps.map((item, position) => (
          <li
            key={item.label}
            aria-current={current === position ? "step" : undefined}
            className={position <= current ? "current" : ""}
          >
            <span>
              {position < current ? <Check size={12} /> : position + 1}
            </span>
            {item.label}
          </li>
        ))}
      </ol>
      <div className="wizard-step" key={current}>
        {step.content}
      </div>
    </FlowDialog>
  );
}
