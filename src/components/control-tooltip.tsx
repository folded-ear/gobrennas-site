"use client";

import { Tooltip } from "@heroui/react";
import { ReactNode } from "react";

type ControlTooltipProps = {
  readonly label: string;
  /** The control I explain. */
  readonly children: ReactNode;
};

/**
 * I explain a control once it has been hovered or focused for the theme's
 * delay, and get out of the way the moment it no longer is.
 */
export function ControlTooltip({ label, children }: ControlTooltipProps) {
  return (
    <Tooltip closeDelay={0}>
      {children}
      <Tooltip.Content showArrow className="rounded-xs">
        <Tooltip.Arrow />
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}
