import { ControlTooltip } from "@/components/control-tooltip";
import { SweepIcon } from "@/components/icons";
import { Button } from "@heroui/react";

const SWEEP_LABEL = "Sweep acquired";

type SweepButtonProps = {
  readonly onSweep: () => void;
};

/** I sweep the shopping list, so every row shows where its status puts it. */
export function SweepButton({ onSweep }: SweepButtonProps) {
  return (
    <ControlTooltip label={SWEEP_LABEL} placement="left">
      <Button
        isIconOnly
        variant="tertiary"
        aria-label={SWEEP_LABEL}
        onPress={onSweep}
      >
        <SweepIcon aria-hidden />
      </Button>
    </ControlTooltip>
  );
}
