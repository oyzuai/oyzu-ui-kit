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
  onComplete: () => Promise<void>;
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
  const step = steps[index];
  return (
    <FlowDialog
      {...props}
      title={step.title}
      description={step.description}
      onOpenChange={(open) => {
        if (open) setIndex(0);
        onOpenChange(open);
      }}
      submitLabel={index === steps.length - 1 ? submitLabel : "Continue"}
      onBack={index > 0 ? () => setIndex(index - 1) : undefined}
      onSubmit={async () => {
        if (step.validate && !step.validate()) return;
        if (index < steps.length - 1) setIndex(index + 1);
        else await onComplete();
      }}
    >
      <ol className="stepper" aria-label="Setup progress">
        {steps.map((item, position) => (
          <li
            key={item.label}
            aria-current={index === position ? "step" : undefined}
            className={position <= index ? "current" : ""}
          >
            <span>{position < index ? <Check size={12} /> : position + 1}</span>
            {item.label}
          </li>
        ))}
      </ol>
      <div className="wizard-step" key={index}>
        {step.content}
      </div>
    </FlowDialog>
  );
}
