"use client";

import {
  Description,
  FieldError,
  Input,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";
import type { ComponentProps } from "react";
import {
  useController,
  type Control,
  type FieldPathByValue,
  type FieldValues,
} from "react-hook-form";

type FormTextFieldProps<Values extends FieldValues> = {
  control: Control<Values>;
  name: FieldPathByValue<Values, string>;
  label: string;
  description?: string;
  isRequired?: boolean;
  onValueChange?: () => void;
} & (
  | { multiline: true; rows?: number }
  | ({ multiline?: false } & Pick<
      ComponentProps<typeof Input>,
      "type" | "min" | "step" | "autoComplete"
    >)
);

/** Connect a string field to RHF; HeroUI supplies labels and error associations. */
export function FormTextField<Values extends FieldValues>(
  props: FormTextFieldProps<Values>,
) {
  const { control, name, label, description, isRequired, onValueChange } =
    props;
  const {
    field: { name: fieldName, value, onBlur, onChange, ref: inputRef },
    fieldState: { error },
    formState: { isSubmitting },
  } = useController({ control, name });

  return (
    <TextField
      name={fieldName}
      value={value}
      onBlur={onBlur}
      onChange={(value) => {
        onChange(value);
        onValueChange?.();
      }}
      isRequired={isRequired}
      isInvalid={error !== undefined}
      isDisabled={isSubmitting}
      validationBehavior="aria"
    >
      <Label className="text-xs">{label}</Label>
      {props.multiline ? (
        <TextArea
          ref={inputRef}
          rows={props.rows}
          className="field-sizing-content min-h-24 max-h-[min(32rem,60vh)] w-full overflow-y-auto px-sm py-xs"
        />
      ) : (
        <Input
          className="px-sm py-xs"
          ref={inputRef}
          type={props.type}
          min={props.min}
          step={props.step}
          autoComplete={props.autoComplete}
        />
      )}
      {description ? <Description>{description}</Description> : null}
      <FieldError>{error?.message}</FieldError>
    </TextField>
  );
}
