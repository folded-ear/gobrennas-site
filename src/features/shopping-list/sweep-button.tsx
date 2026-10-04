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
    <ControlTooltip label={SWEEP_LABEL}>
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label={SWEEP_LABEL}
        onPress={onSweep}
      >
        <SweepIcon size="small" aria-hidden />
      </Button>
    </ControlTooltip>
  );
}
