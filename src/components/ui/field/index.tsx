"use client";

import {
  FieldError as AriaFieldError,
  FieldErrorProps as AriaFieldErrorProps,
  Group as AriaGroup,
  GroupProps as AriaGroupProps,
  Label as AriaLabel,
  LabelProps as AriaLabelProps,
  Text as AriaText,
  TextProps as AriaTextProps,
  composeRenderProps,
} from "react-aria-components";

import { FieldStyles } from "@/components/ui/field/styles";
import { VariantProps } from "tailwind-variants";

const { label, description, error, field } = FieldStyles();

const Label = ({ className, ...props }: AriaLabelProps) => (
  <AriaLabel className={label({ className })} {...props} />
);

function FormDescription({ className, ...props }: AriaTextProps) {
  return (
    <AriaText
      className={description({ className })}
      {...props}
      slot="description"
    />
  );
}

function FieldError({ className, ...props }: AriaFieldErrorProps) {
  return (
    <AriaFieldError
      className={composeRenderProps(className, (className) =>
        error({ className }),
      )}
      {...props}
    />
  );
}

interface GroupProps extends AriaGroupProps, VariantProps<typeof FieldStyles> {}

function FieldGroup({ className, variant, ...props }: GroupProps) {
  return (
    <AriaGroup
      className={composeRenderProps(className, (className) =>
        field({ variant, className }),
      )}
      {...props}
    />
  );
}

export { FieldError, FieldGroup, FormDescription, Label };
