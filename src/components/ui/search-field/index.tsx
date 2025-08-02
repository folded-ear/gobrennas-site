"use client";

import { SearchIcon, XIcon } from "lucide-react";
import {
  Button as AriaButton,
  ButtonProps as AriaButtonProps,
  Group as AriaGroup,
  GroupProps as AriaGroupProps,
  Input as AriaInput,
  InputProps as AriaInputProps,
  SearchField as AriaSearchField,
  SearchFieldProps as AriaSearchFieldProps,
  ValidationResult as AriaValidationResult,
  composeRenderProps,
  Text,
} from "react-aria-components";

import { SearchFieldStyles } from "@/components/ui/search-field/styles";
import { FieldError, FieldGroup, Label } from "../field";

const { search, input, group, clear } = SearchFieldStyles();

export function Search({ className, ...props }: AriaSearchFieldProps) {
  return (
    <AriaSearchField
      className={composeRenderProps(className, (className) =>
        search({ className }),
      )}
      {...props}
    />
  );
}

function SearchInput({ className, ...props }: AriaInputProps) {
  return (
    <AriaInput
      className={composeRenderProps(className, (className) =>
        input({ className }),
      )}
      {...props}
    />
  );
}

function SearchGroup({ className, ...props }: AriaGroupProps) {
  return (
    <AriaGroup
      className={composeRenderProps(className, (className) =>
        group({ className }),
      )}
      {...props}
    />
  );
}

function SearchClear({ className, ...props }: AriaButtonProps) {
  return (
    <AriaButton
      className={composeRenderProps(className, (className) =>
        clear({ className }),
      )}
      {...props}
    />
  );
}

interface SearchFieldProps extends AriaSearchFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: AriaValidationResult) => string);
}

export function SearchField({
  label,
  description,
  className,
  errorMessage,
  ...props
}: SearchFieldProps) {
  return (
    <Search
      className={composeRenderProps(className, (className) =>
        search({ className }),
      )}
      {...props}
    >
      <Label>{label}</Label>
      <FieldGroup>
        <SearchIcon aria-hidden className="size-4 text-muted-foreground" />
        <SearchInput placeholder="Search..." />
        <SearchClear>
          <XIcon aria-hidden className="size-4" />
        </SearchClear>
      </FieldGroup>
      {description && (
        <Text className="text-sm text-muted-foreground" slot="description">
          {description}
        </Text>
      )}
      <FieldError>{errorMessage}</FieldError>
    </Search>
  );
}

Search.Clear = SearchClear;
Search.Group = SearchGroup;
Search.Input = SearchInput;
