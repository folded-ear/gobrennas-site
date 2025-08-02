"use client";

import { ChevronDown } from "lucide-react";
import {
  Button as AriaButton,
  ButtonProps as AriaButtonProps,
  ListBox as AriaListBox,
  ListBoxProps as AriaListBoxProps,
  PopoverProps as AriaPopoverProps,
  Select as AriaSelect,
  SelectProps as AriaSelectProps,
  SelectValue as AriaSelectValue,
  SelectValueProps as AriaSelectValueProps,
  ValidationResult as AriaValidationResult,
  composeRenderProps,
  Text,
} from "react-aria-components";

import { SelectStyles } from "@/components/ui/select/styles";
import { FieldError, Label } from "../field";
import {
  ListBoxCollection,
  ListBoxHeader,
  ListBoxItem,
  ListBoxSection,
} from "../list-box";
import { Popover } from "../popover";

const { select, value, trigger, popover, list } = SelectStyles();

const Select = AriaSelect;

const SelectItem = ListBoxItem;

const SelectHeader = ListBoxHeader;

const SelectSection = ListBoxSection;

const SelectCollection = ListBoxCollection;

const SelectValue = <T extends object>({
  className,
  ...props
}: AriaSelectValueProps<T>) => (
  <AriaSelectValue
    className={composeRenderProps(className, (className) =>
      value({ className }),
    )}
    {...props}
  />
);

const SelectTrigger = ({ className, children, ...props }: AriaButtonProps) => (
  <AriaButton
    className={composeRenderProps(className, (className) =>
      trigger({ className }),
    )}
    {...props}
  >
    {composeRenderProps(children, (children) => (
      <>
        {children}
        <ChevronDown aria-hidden="true" className="size-4 opacity-50" />
      </>
    ))}
  </AriaButton>
);

const SelectPopover = ({ className, ...props }: AriaPopoverProps) => (
  <Popover
    className={composeRenderProps(className, (className) =>
      popover({ className }),
    )}
    {...props}
  />
);

const SelectListBox = <T extends object>({
  className,
  ...props
}: AriaListBoxProps<T>) => (
  <AriaListBox
    className={composeRenderProps(className, (className) =>
      list({ className }),
    )}
    {...props}
  />
);

interface SelectFieldProps<T extends object>
  extends Omit<AriaSelectProps<T>, "children"> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: AriaValidationResult) => string);
  items?: Iterable<T>;
  children: React.ReactNode | ((item: T) => React.ReactNode);
}

function SelectField<T extends object>({
  label,
  description,
  errorMessage,
  children,
  className,
  items,
  ...props
}: SelectFieldProps<T>) {
  return (
    <Select
      className={composeRenderProps(className, (className) =>
        select({ className }),
      )}
      {...props}
    >
      <Label>{label}</Label>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      {description && (
        <Text className="text-sm text-muted-foreground" slot="description">
          {description}
        </Text>
      )}
      <FieldError>{errorMessage}</FieldError>
      <SelectPopover>
        <SelectListBox items={items}>{children}</SelectListBox>
      </SelectPopover>
    </Select>
  );
}

export {
  Select,
  SelectCollection,
  SelectField,
  SelectHeader,
  SelectItem,
  SelectListBox,
  SelectPopover,
  SelectSection,
  SelectTrigger,
  SelectValue,
};
