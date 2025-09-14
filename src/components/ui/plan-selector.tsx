import { Label } from "@/components/ui/typography";
import { tv } from "@/lib/utils";
import { Chip } from "@heroui/chip";
import { type CheckboxProps, useCheckbox, VisuallyHidden } from "@heroui/react";
import { CheckIcon } from "lucide-react";

export const PlanChip = (props: CheckboxProps) => {
  const {
    children,
    isSelected,
    isFocusVisible,
    getBaseProps,
    getLabelProps,
    getInputProps,
  } = useCheckbox({
    defaultSelected: true,
    ...props,
  });

  const checkbox = tv({
    slots: {
      base: "border-default hover:bg-default-200",
      content: "text-default-500",
    },
    variants: {
      isSelected: {
        true: {
          base: "border-primary bg-primary hover:bg-primary-500 hover:border-primary-500",
          content: "text-primary-foreground pl-1",
        },
      },
      isFocusVisible: {
        true: {
          base: "outline-solid outline-transparent ring-2 ring-focus ring-offset-2 ring-offset-background",
        },
      },
    },
  });

  const styles = checkbox({ isSelected, isFocusVisible });

  return (
    <label {...getBaseProps()}>
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <Chip
        classNames={{
          base: styles.base(),
          content: styles.content(),
        }}
        color="primary"
        startContent={isSelected ? <CheckIcon className="ml-1" /> : null}
        variant="faded"
        {...getLabelProps()}
      >
        {children}
      </Chip>
    </label>
  );
};

export const PlanSelector = () => {
  return (
    <div className="max-w-full px-xl py-sm flex bg-background-muted">
      <div className="flex-1">
        <Label>My plans:</Label>
        <PlanChip>Our Week</PlanChip>
        <PlanChip>Thanksgiving</PlanChip>
      </div>
      <div className="flex-1">
        <Label>Others&apos; plans:</Label>
        <PlanChip>Barney&apos;s Week</PlanChip>
      </div>
    </div>
  );
};
