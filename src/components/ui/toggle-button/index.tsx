"use client";

import {
  ToggleButton as AriaToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
  ToggleButtonGroupProps as AriaToggleButtonGroupProps,
  ToggleButtonProps as AriaToggleProps,
  composeRenderProps,
} from "react-aria-components";

import { VariantProps } from "tailwind-variants";
import { ToggleGroupStyles, ToggleStyles } from "./styles";

type ToggleButtonProps = AriaToggleProps & VariantProps<typeof ToggleStyles>;

const ToggleButton = ({
  className,
  variant,
  size,
  ...props
}: ToggleButtonProps) => (
  <AriaToggleButton
    className={composeRenderProps(className, (className) =>
      ToggleStyles({
        variant,
        size,
        className,
      }),
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
    className={composeRenderProps(className, (className) =>
      ToggleGroupStyles({ className }),
    )}
    {...props}
  >
    {children}
  </AriaToggleButtonGroup>
);

export { ToggleButton, ToggleButtonGroup };
export type { ToggleButtonProps };
