"use client";

import {
  ToggleButton as AriaToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
  ToggleButtonGroupProps as AriaToggleButtonGroupProps,
  ToggleButtonProps as AriaToggleProps,
  composeRenderProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";
import { VariantProps } from "tailwind-variants";
import { ButtonDefaults, ToggleGroupStyles, ToggleStyles } from "./styles";

type ToggleButtonProps = AriaToggleProps & VariantProps<typeof ToggleStyles>;

const ToggleButton = ({
  className,
  variant = ButtonDefaults["variant"],
  size = ButtonDefaults["size"],
  ...props
}: ToggleButtonProps) => (
  <AriaToggleButton
    className={composeRenderProps(className, (resolved) =>
      cn(ToggleStyles({ variant, size }), resolved),
    )}
    {...props}
  />
);

const ToggleButtonGroup = ({
  children,
  className,
  ...props
}: AriaToggleButtonGroupProps) => (
  <AriaToggleButtonGroup
    className={composeRenderProps(className, (resolved) =>
      cn(ToggleGroupStyles(), resolved),
    )}
    {...props}
  >
    {children}
  </AriaToggleButtonGroup>
);

export { ToggleButton, ToggleButtonGroup };
export type { ToggleButtonProps };
