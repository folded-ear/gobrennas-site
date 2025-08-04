"use client";

import {
  Button as AriaButton,
  composeRenderProps,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components";

import { ButtonStyles } from "@/components/ui/button/styles";
import { VariantProps } from "tailwind-variants";

type ButtonProps = AriaButtonProps & VariantProps<typeof ButtonStyles>;

const Button = ({ className, variant, size, ...props }: ButtonProps) => {
  return (
    <AriaButton
      className={composeRenderProps(className, (className) =>
        ButtonStyles({
          variant,
          size,
          className,
        }),
      )}
      {...props}
    />
  );
};

export { Button };
export type { ButtonProps };
